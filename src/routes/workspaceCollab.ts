import { type Express, type Request, type Response } from "express";
import { type PrismaClient, WorkspaceRole, CollabRequestStatus } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError, forbiddenError, notFoundError, conflictError } from "../lib/http.js";
import { emitToUser, emitToWorkspace } from "../lib/realtime.js";
import { isAdminEmail } from "../lib/admin.js";

/** ideaId 기준으로 OWNER(세션 소유자) 또는 워크스페이스 멤버인지 확인 */
async function getIdeaWithAccess(
  prisma: PrismaClient,
  ideaId: string,
  userId: string,
): Promise<{ isOwner: boolean; role: WorkspaceRole | "OWNER" } | null> {
  const idea = await prisma.generatedIdea.findUnique({
    where: { id: ideaId },
    include: { session: { include: { projectPolicy: true } } },
  });
  if (!idea) return null;

  if (idea.session.projectPolicy.userId === userId) {
    return { isOwner: true, role: "OWNER" };
  }

  const member = await prisma.ideaWorkspaceMember.findUnique({
    where: { ideaId_userId: { ideaId, userId } },
  });
  if (!member) return null;

  return { isOwner: false, role: member.role };
}

export function registerWorkspaceCollabRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
  /* ─── 워크스페이스 멤버 목록 조회 ─── */
  app.get(
    "/api/workspace/:ideaId/members",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);

        const access = await getIdeaWithAccess(prisma, ideaId, userId);
        if (!access) {
          res.status(403).json({ error: "접근 권한이 없습니다." });
          return;
        }

        const members = await prisma.ideaWorkspaceMember.findMany({
          where: { ideaId },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        });

        res.json({ members });
      } catch (err) {
        handleRouteError(res, err, "워크스페이스 멤버 조회 오류");
      }
    },
  );

  /* ─── 멤버 직접 추가 (OWNER only) ─── */
  app.post(
    "/api/workspace/:ideaId/members",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);
        const { targetUserId, role = "EDITOR" } = req.body as {
          targetUserId: string;
          role?: WorkspaceRole;
        };

        const access = await getIdeaWithAccess(prisma, ideaId, userId);
        if (!access?.isOwner) {
          throw forbiddenError("OWNER만 멤버를 추가할 수 있습니다.");
        }

        if (targetUserId === userId) {
          res.status(400).json({ error: "자기 자신은 추가할 수 없습니다." });
          return;
        }

        const existing = await prisma.ideaWorkspaceMember.findUnique({
          where: { ideaId_userId: { ideaId, userId: targetUserId } },
        });
        if (existing) throw conflictError("이미 워크스페이스 멤버입니다.");

        // 팀 구독 한도 검증 — 구독 없으면 FREE(1명, OWNER만). Admin은 우회.
        const ownerUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (!isAdminEmail(ownerUser?.email)) {
          const sub = await prisma.workspaceSubscription.findUnique({ where: { ideaId } });
          const max = sub?.maxMembers ?? 1; // 구독 없으면 OWNER 1명만
          const cur = await prisma.ideaWorkspaceMember.count({ where: { ideaId } });
          const totalIncludingOwner = cur + 1;
          // max 0 = 무제한 (Enterprise)
          if (max !== 0 && totalIncludingOwner >= max) {
            res.status(402).json({
              error: "현재 플랜의 멤버 한도에 도달했습니다.",
              errorCode: "MEMBER_LIMIT_REACHED",
              currentMembers: totalIncludingOwner,
              maxMembers: max,
              currentPlan: sub?.planType ?? "FREE",
              upgradeRequired: true,
            });
            return;
          }
        }

        const member = await prisma.ideaWorkspaceMember.create({
          data: { ideaId, userId: targetUserId, role },
          include: { user: { select: { id: true, name: true, email: true } } },
        });

        res.status(201).json({ member });
      } catch (err) {
        handleRouteError(res, err, "워크스페이스 멤버 추가 오류");
      }
    },
  );

  /* ─── 멤버 역할 변경 (OWNER only) ─── */
  app.patch(
    "/api/workspace/:ideaId/members/:memberId",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);
        const memberId = String(req.params.memberId);
        const { role } = req.body as { role: WorkspaceRole };

        const access = await getIdeaWithAccess(prisma, ideaId, userId);
        if (!access?.isOwner) throw forbiddenError("OWNER만 역할을 변경할 수 있습니다.");

        const updated = await prisma.ideaWorkspaceMember.update({
          where: { id: memberId },
          data: { role },
          include: { user: { select: { id: true, name: true, email: true } } },
        });

        res.json({ member: updated });
      } catch (err) {
        handleRouteError(res, err, "워크스페이스 멤버 역할 변경 오류");
      }
    },
  );

  /* ─── 멤버 제거 (OWNER only, 또는 본인 탈퇴) ─── */
  app.delete(
    "/api/workspace/:ideaId/members/:memberId",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);
        const memberId = String(req.params.memberId);

        const member = await prisma.ideaWorkspaceMember.findUnique({
          where: { id: memberId },
        });
        if (!member || member.ideaId !== ideaId) {
          throw notFoundError("멤버를 찾을 수 없습니다.");
        }

        const access = await getIdeaWithAccess(prisma, ideaId, userId);
        const isSelf = member.userId === userId;
        if (!access?.isOwner && !isSelf) {
          throw forbiddenError("OWNER 또는 본인만 제거할 수 있습니다.");
        }

        await prisma.ideaWorkspaceMember.delete({ where: { id: memberId } });
        res.json({ ok: true });
      } catch (err) {
        handleRouteError(res, err, "워크스페이스 멤버 제거 오류");
      }
    },
  );

  /* ─── 전문가 협업 요청 전송 ─── */
  app.post(
    "/api/workspace/:ideaId/collab-requests",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);
        const { expertUserId, message, grantRole = "EDITOR" } = req.body as {
          expertUserId: string;
          message?: string;
          grantRole?: WorkspaceRole;
        };

        const access = await getIdeaWithAccess(prisma, ideaId, userId);
        if (!access?.isOwner) throw forbiddenError("OWNER만 협업 요청을 보낼 수 있습니다.");

        const existing = await prisma.expertCollabRequest.findUnique({
          where: { ideaId_requesterId_expertUserId: { ideaId, requesterId: userId, expertUserId } },
        });
        if (existing && existing.status === "PENDING") {
          throw conflictError("이미 대기 중인 요청이 있습니다.");
        }

        const request = await prisma.expertCollabRequest.create({
          data: { ideaId, requesterId: userId, expertUserId, message, grantRole },
        });

        emitToUser(expertUserId, "collab.request.received", { request });
        emitToUser(expertUserId, "notification.new", { kind: "collab_request" });

        res.status(201).json({ request });
      } catch (err) {
        handleRouteError(res, err, "협업 요청 전송 오류");
      }
    },
  );

  /* ─── 받은 협업 요청 목록 (전문가 본인) ─── */
  app.get(
    "/api/collab-requests/received",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);

        const requests = await prisma.expertCollabRequest.findMany({
          where: { expertUserId: userId },
          orderBy: { createdAt: "desc" },
          include: {
            idea: { select: { id: true, titleKo: true, oneLinerKo: true } },
            requester: { select: { id: true, name: true, email: true } },
          },
        });

        res.json({ requests });
      } catch (err) {
        handleRouteError(res, err, "받은 협업 요청 조회 오류");
      }
    },
  );

  /* ─── 보낸 협업 요청 목록 ─── */
  app.get(
    "/api/workspace/:ideaId/collab-requests",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);

        const access = await getIdeaWithAccess(prisma, ideaId, userId);
        if (!access?.isOwner) throw forbiddenError("OWNER만 요청 목록을 볼 수 있습니다.");

        const requests = await prisma.expertCollabRequest.findMany({
          where: { ideaId },
          orderBy: { createdAt: "desc" },
          include: {
            expert: { select: { id: true, name: true, email: true } },
          },
        });

        res.json({ requests });
      } catch (err) {
        handleRouteError(res, err, "보낸 협업 요청 조회 오류");
      }
    },
  );

  /* ─── 협업 요청 수락/거절 (전문가 본인) ─── */
  app.patch(
    "/api/collab-requests/:requestId",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const requestId = String(req.params.requestId);
        const { status } = req.body as { status: "ACCEPTED" | "REJECTED" };

        const collabReq = await prisma.expertCollabRequest.findUnique({
          where: { id: requestId },
        });
        if (!collabReq) throw notFoundError("요청을 찾을 수 없습니다.");
        if (collabReq.expertUserId !== userId) throw forbiddenError("본인 요청만 처리할 수 있습니다.");
        if (collabReq.status !== "PENDING") throw conflictError("이미 처리된 요청입니다.");

        const updated = await prisma.$transaction(async (tx) => {
          const req = await tx.expertCollabRequest.update({
            where: { id: requestId },
            data: { status },
          });

          if (status === "ACCEPTED") {
            // 이미 멤버인 경우 upsert로 처리
            await tx.ideaWorkspaceMember.upsert({
              where: { ideaId_userId: { ideaId: collabReq.ideaId, userId } },
              create: { ideaId: collabReq.ideaId, userId, role: collabReq.grantRole },
              update: { role: collabReq.grantRole },
            });
          }

          return req;
        });

        emitToUser(collabReq.requesterId, "collab.request.updated", { request: updated });
        if (status === "ACCEPTED") {
          emitToWorkspace(prisma, collabReq.ideaId, "workspace.member.added", { ideaId: collabReq.ideaId, userId }).catch(() => {});
        }

        res.json({ request: updated });
      } catch (err) {
        handleRouteError(res, err, "협업 요청 처리 오류");
      }
    },
  );

  /* ─── 협업 요청 취소 (요청자 본인) ─── */
  app.delete(
    "/api/collab-requests/:requestId",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const requestId = String(req.params.requestId);

        const collabReq = await prisma.expertCollabRequest.findUnique({
          where: { id: requestId },
        });
        if (!collabReq) throw notFoundError("요청을 찾을 수 없습니다.");
        if (collabReq.requesterId !== userId) throw forbiddenError("요청자만 취소할 수 있습니다.");

        await prisma.expertCollabRequest.update({
          where: { id: requestId },
          data: { status: "CANCELLED" },
        });

        res.json({ ok: true });
      } catch (err) {
        handleRouteError(res, err, "협업 요청 취소 오류");
      }
    },
  );
}
