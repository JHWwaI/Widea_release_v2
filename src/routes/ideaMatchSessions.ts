import { type Express, type Request, type Response } from "express";
import { IdeaStatus, type PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";
import { ensureWorkspaceForIdea } from "../lib/workspace.js";
import { isAdminEmail } from "../lib/admin.js";

type RegisterIdeaMatchSessionRoutesOptions = {
  prisma: PrismaClient;
};

export function registerIdeaMatchSessionRoutes(
  app: Express,
  { prisma }: RegisterIdeaMatchSessionRoutesOptions,
): void {
  app.get("/api/idea-match/sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const projectId =
        typeof req.query.projectId === "string" && req.query.projectId.trim()
          ? req.query.projectId.trim()
          : undefined;
      const where = {
        projectPolicy: { userId },
        ...(projectId ? { projectPolicyId: projectId } : {}),
      };

      const sessions = await prisma.ideaMatchSession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          searchQuery: true,
          matchedCases: true,
          locale: true,
          generationVersion: true,
          createdAt: true,
          generatedIdeas: {
            where: {
              status: {
                in: [IdeaStatus.SELECTED, IdeaStatus.SHORTLISTED],
              },
            },
            orderBy: [{ updatedAt: "desc" }, { rank: "asc" }],
            select: {
              id: true,
              rank: true,
              status: true,
              titleKo: true,
              oneLinerKo: true,
              marketFitScore: true,
              sourceBenchmarks: true,
              updatedAt: true,
            },
          },
          _count: {
            select: {
              generatedIdeas: true,
            },
          },
          projectPolicy: {
            select: {
              id: true,
              title: true,
              budgetRange: true,
              industries: true,
              targetCustomerAge: true,
            },
          },
        },
      });

      const total = await prisma.ideaMatchSession.count({
        where,
      });

      res.json({ total, limit, offset, sessions });
    } catch (err) {
      handleRouteError(res, err, "Idea Match 세션 목록 오류");
    }
  });

  app.get("/api/idea-match/sessions/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const id = String(req.params.id);

      const session = await prisma.ideaMatchSession.findUnique({
        where: { id },
        include: {
          projectPolicy: {
            select: {
              id: true,
              title: true,
            },
          },
          generatedIdeas: {
            orderBy: { rank: "asc" },
          },
        },
      });

      if (!session) {
        res.status(404).json({ error: "세션을 찾을 수 없습니다." });
        return;
      }

      const policy = await prisma.projectPolicy.findUnique({ where: { id: session.projectPolicyId } });
      if (!policy || policy.userId !== userId) {
        res.status(404).json({ error: "세션을 찾을 수 없습니다." });
        return;
      }

      res.json(session);
    } catch (err) {
      handleRouteError(res, err, "Idea Match 세션 상세 오류");
    }
  });

  /**
   * GET /api/ideas/:id
   * 단일 아이디어 상세 조회 (워크스페이스용)
   */
  app.get("/api/ideas/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const id = String(req.params.id);

      const idea = await prisma.generatedIdea.findUnique({
        where: { id },
        include: {
          session: {
            include: {
              projectPolicy: {
                select: { id: true, title: true, userId: true, targetMarket: true },
              },
            },
          },
        },
      });

      if (!idea || idea.session.projectPolicy.userId !== userId) {
        res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
        return;
      }

      res.json({
        ...idea,
        sessionId: idea.sessionId,
        projectPolicy: {
          id: idea.session.projectPolicy.id,
          title: idea.session.projectPolicy.title,
          targetMarket: idea.session.projectPolicy.targetMarket,
        },
        matchedCases: idea.session.matchedCases,
      });
    } catch (err) {
      handleRouteError(res, err, "아이디어 상세 조회 오류");
    }
  });

  // 아이디어 제목(titleKo) 변경 — 워크스페이스 이름 변경에 해당
  app.patch("/api/ideas/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const id = String(req.params.id);
      const { titleKo } = req.body as { titleKo?: string };

      if (!titleKo || typeof titleKo !== "string" || !titleKo.trim()) {
        res.status(400).json({ error: "제목을 입력해주세요." });
        return;
      }
      if (titleKo.trim().length > 200) {
        res.status(400).json({ error: "제목은 200자 이하로 입력해주세요." });
        return;
      }

      const idea = await prisma.generatedIdea.findUnique({
        where: { id },
        include: { session: { include: { projectPolicy: { select: { userId: true } } } } },
      });
      if (!idea) {
        res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
        return;
      }
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      const isOwner = idea.session.projectPolicy.userId === userId;
      if (!isOwner && !isAdminEmail(actor?.email)) {
        res.status(403).json({ error: "권한이 없습니다." });
        return;
      }

      const updated = await prisma.generatedIdea.update({
        where: { id },
        data: { titleKo: titleKo.trim() },
        select: { id: true, titleKo: true },
      });
      res.json(updated);
    } catch (err) {
      handleRouteError(res, err, "아이디어 제목 변경 오류");
    }
  });

  app.patch("/api/ideas/:id/plan", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const id = String(req.params.id);

      const idea = await prisma.generatedIdea.findUnique({
        where: { id },
        include: { session: { include: { projectPolicy: { select: { userId: true } } } } },
      });

      if (!idea || idea.session.projectPolicy.userId !== userId) {
        res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
        return;
      }

      const { plan, customSections, checked } = req.body;
      const planData = {
        ...(plan !== undefined && { plan }),
        ...(customSections !== undefined && { customSections }),
        ...(checked !== undefined && { checked }),
      };

      await prisma.generatedIdea.update({
        where: { id },
        data: { planData },
      });

      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err, "기획 데이터 저장 오류");
    }
  });

  app.patch("/api/idea-match/ideas/:id/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const id = String(req.params.id);
      const { status } = req.body as { status?: string };

      if (!status || !Object.values(IdeaStatus).includes(status as IdeaStatus)) {
        res.status(400).json({
          error: "status must be one of DRAFT, SHORTLISTED, SELECTED, ARCHIVED.",
        });
        return;
      }

      const idea = await prisma.generatedIdea.findUnique({
        where: { id },
        include: {
          session: {
            include: {
              projectPolicy: {
                select: {
                  id: true,
                  title: true,
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (!idea) {
        res.status(404).json({ error: "Idea not found." });
        return;
      }
      const actorStatus = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      const isOwnerStatus = idea.session.projectPolicy.userId === userId;
      if (!isOwnerStatus && !isAdminEmail(actorStatus?.email)) {
        res.status(403).json({ error: "권한이 없습니다." });
        return;
      }

      const nextStatus = status as IdeaStatus;

      const updatedIdea = await prisma.$transaction(async (tx) => {
        if (nextStatus === IdeaStatus.SELECTED) {
          await tx.generatedIdea.updateMany({
            where: {
              sessionId: idea.sessionId,
              status: IdeaStatus.SELECTED,
              NOT: { id: idea.id },
            },
            data: {
              status: IdeaStatus.SHORTLISTED,
            },
          });
          // 대표 아이디어 선정 시 워크스페이스 자동 셸 생성 (idempotent)
          await ensureWorkspaceForIdea(tx, idea.id);
        }

        return tx.generatedIdea.update({
          where: { id: idea.id },
          data: { status: nextStatus },
        });
      });

      res.json({
        idea: updatedIdea,
        sessionId: idea.sessionId,
        projectPolicy: {
          id: idea.session.projectPolicy.id,
          title: idea.session.projectPolicy.title,
        },
      });
    } catch (err) {
      handleRouteError(res, err, "Idea Match idea status update error");
    }
  });
}
