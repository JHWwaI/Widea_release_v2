/**
 * 1:1 DM (Direct Messages) 라우트.
 * - userCode 또는 email로 상대방 찾기 → 대화방 생성/조회
 * - 대화 목록·메시지 조회·전송·읽음 처리
 *
 * `userAId < userBId` 정렬로 unique 보장.
 */

import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import { emitToUser } from "../lib/realtime.js";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";

/** [a, b]를 사전 순으로 정렬해서 반환 */
function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

const PEER_SELECT = {
  id: true,
  name: true,
  email: true,
  userCode: true,
} as const;

export function registerDmRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
  /* ─── POST /api/dm/start
     identifier (userCode 6자 또는 email)로 상대를 찾아 대화방 upsert */
  app.post(
    "/api/dm/start",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const raw = String(req.body?.identifier ?? "").trim();
        if (!raw) {
          res.status(400).json({ error: "ID 또는 이메일을 입력해주세요." });
          return;
        }

        // userCode (6자 대문자+숫자) vs email 분기
        const isEmail = raw.includes("@");
        const peer = isEmail
          ? await prisma.user.findUnique({
              where: { email: raw.toLowerCase() },
              select: PEER_SELECT,
            })
          : await prisma.user.findFirst({
              where: { userCode: raw.toUpperCase() },
              select: PEER_SELECT,
            });

        if (!peer) {
          res.status(404).json({ error: "해당 사용자를 찾을 수 없습니다." });
          return;
        }
        if (peer.id === userId) {
          res.status(400).json({ error: "본인에게는 메시지를 보낼 수 없습니다." });
          return;
        }

        const [userAId, userBId] = pair(userId, peer.id);
        const conv = await prisma.directConversation.upsert({
          where: { userAId_userBId: { userAId, userBId } },
          create: { userAId, userBId },
          update: {},
          select: {
            id: true,
            createdAt: true,
            lastMessageAt: true,
            userA: { select: PEER_SELECT },
            userB: { select: PEER_SELECT },
          },
        });

        res.json({ conversation: conv, peer });
      } catch (err) {
        handleRouteError(res, err, "DM 시작 오류");
      }
    },
  );

  /* ─── GET /api/dm/conversations
     내 대화 목록 (최근 메시지 순) — 상대 정보 + 마지막 메시지 + 안 읽은 수 */
  app.get(
    "/api/dm/conversations",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const conversations = await prisma.directConversation.findMany({
          where: { OR: [{ userAId: userId }, { userBId: userId }] },
          orderBy: [
            { lastMessageAt: { sort: "desc", nulls: "last" } },
            { createdAt: "desc" },
          ],
          take: 100,
          select: {
            id: true,
            lastMessageAt: true,
            createdAt: true,
            userA: { select: PEER_SELECT },
            userB: { select: PEER_SELECT },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
              },
            },
          },
        });

        // 안 읽은 수: 상대방이 보냈는데 readAt이 null인 메시지 카운트
        const ids = conversations.map((c) => c.id);
        const unreadCounts = ids.length
          ? await prisma.directMessage.groupBy({
              by: ["conversationId"],
              where: {
                conversationId: { in: ids },
                senderId: { not: userId },
                readAt: null,
              },
              _count: { _all: true },
            })
          : [];
        const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count._all]));

        const result = conversations.map((c) => {
          const peer = c.userA.id === userId ? c.userB : c.userA;
          return {
            id: c.id,
            peer,
            lastMessage: c.messages[0] ?? null,
            lastMessageAt: c.lastMessageAt,
            unreadCount: unreadMap.get(c.id) ?? 0,
          };
        });

        res.json({ conversations: result });
      } catch (err) {
        handleRouteError(res, err, "DM 목록 오류");
      }
    },
  );

  /* ─── GET /api/dm/conversations/:id/messages
     메시지 목록 (오래된 → 최신, 최대 200) + 상대 정보 */
  app.get(
    "/api/dm/conversations/:id/messages",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);
        const conv = await prisma.directConversation.findUnique({
          where: { id },
          select: {
            id: true,
            userA: { select: PEER_SELECT },
            userB: { select: PEER_SELECT },
          },
        });
        if (!conv) { res.status(404).json({ error: "대화 없음" }); return; }
        if (conv.userA.id !== userId && conv.userB.id !== userId) {
          res.status(403).json({ error: "접근 권한 없음" }); return;
        }

        const messages = await prisma.directMessage.findMany({
          where: { conversationId: id },
          orderBy: { createdAt: "asc" },
          take: 200,
          select: {
            id: true,
            senderId: true,
            content: true,
            readAt: true,
            createdAt: true,
          },
        });

        const peer = conv.userA.id === userId ? conv.userB : conv.userA;
        res.json({ peer, messages });
      } catch (err) {
        handleRouteError(res, err, "메시지 조회 오류");
      }
    },
  );

  /* ─── POST /api/dm/conversations/:id/messages
     메시지 전송 */
  app.post(
    "/api/dm/conversations/:id/messages",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);
        const content = String(req.body?.content ?? "").trim();
        if (!content) { res.status(400).json({ error: "내용 비어있음" }); return; }
        if (content.length > 4000) { res.status(400).json({ error: "메시지가 너무 깁니다 (4000자 이하)." }); return; }

        const conv = await prisma.directConversation.findUnique({
          where: { id },
          select: { userAId: true, userBId: true },
        });
        if (!conv) { res.status(404).json({ error: "대화 없음" }); return; }
        if (conv.userAId !== userId && conv.userBId !== userId) {
          res.status(403).json({ error: "접근 권한 없음" }); return;
        }

        const now = new Date();
        const [message] = await prisma.$transaction([
          prisma.directMessage.create({
            data: { conversationId: id, senderId: userId, content },
            select: {
              id: true,
              senderId: true,
              content: true,
              readAt: true,
              createdAt: true,
            },
          }),
          prisma.directConversation.update({
            where: { id },
            data: { lastMessageAt: now },
          }),
        ]);

        const otherUserId = conv.userAId === userId ? conv.userBId : conv.userAId;
        emitToUser(otherUserId, "dm.message", {
          conversationId: id,
          message: { ...message, senderId: userId },
        });
        emitToUser(otherUserId, "notification.new", { kind: "dm" });

        res.status(201).json({ message });
      } catch (err) {
        handleRouteError(res, err, "메시지 전송 오류");
      }
    },
  );

  /* ─── POST /api/dm/conversations/:id/read
     상대방이 보낸 메시지를 모두 읽음 처리 */
  app.post(
    "/api/dm/conversations/:id/read",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);
        const conv = await prisma.directConversation.findUnique({
          where: { id },
          select: { userAId: true, userBId: true },
        });
        if (!conv) { res.status(404).json({ error: "대화 없음" }); return; }
        if (conv.userAId !== userId && conv.userBId !== userId) {
          res.status(403).json({ error: "접근 권한 없음" }); return;
        }

        const result = await prisma.directMessage.updateMany({
          where: {
            conversationId: id,
            senderId: { not: userId },
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        res.json({ markedRead: result.count });
      } catch (err) {
        handleRouteError(res, err, "읽음 처리 오류");
      }
    },
  );

  /* ─── DELETE /api/dm/conversations/:id
     대화방 나가기 — 양쪽 모두 사라짐 (cascade로 메시지 전부 삭제) */
  app.delete(
    "/api/dm/conversations/:id",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);
        const conv = await prisma.directConversation.findUnique({
          where: { id },
          select: { userAId: true, userBId: true },
        });
        if (!conv) { res.status(404).json({ error: "대화 없음" }); return; }
        if (conv.userAId !== userId && conv.userBId !== userId) {
          res.status(403).json({ error: "접근 권한 없음" }); return;
        }
        await prisma.directConversation.delete({ where: { id } });
        const otherUserId = conv.userAId === userId ? conv.userBId : conv.userAId;
        emitToUser(otherUserId, "dm.conversation.deleted", { conversationId: id });
        res.json({ ok: true });
      } catch (err) {
        handleRouteError(res, err, "대화 삭제 오류");
      }
    },
  );

  /* ─── DELETE /api/dm/messages/:id
     내 메시지 삭제 — 본인만 가능 */
  app.delete(
    "/api/dm/messages/:id",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);
        const msg = await prisma.directMessage.findUnique({
          where: { id },
          select: { senderId: true, conversationId: true, conversation: { select: { userAId: true, userBId: true } } },
        });
        if (!msg) { res.status(404).json({ error: "메시지 없음" }); return; }
        if (msg.senderId !== userId) {
          res.status(403).json({ error: "본인 메시지만 삭제할 수 있습니다." }); return;
        }
        await prisma.directMessage.delete({ where: { id } });
        const otherUserId = msg.conversation.userAId === userId ? msg.conversation.userBId : msg.conversation.userAId;
        emitToUser(otherUserId, "dm.message.deleted", { conversationId: msg.conversationId, messageId: id });
        res.json({ ok: true });
      } catch (err) {
        handleRouteError(res, err, "메시지 삭제 오류");
      }
    },
  );

  /* ─── PATCH /api/dm/messages/:id
     내 메시지 편집 — 본인 + 5분 이내 */
  app.patch(
    "/api/dm/messages/:id",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);
        const content = String(req.body?.content ?? "").trim();
        if (!content) { res.status(400).json({ error: "내용을 입력해주세요." }); return; }
        if (content.length > 2000) { res.status(400).json({ error: "메시지가 너무 깁니다." }); return; }

        const msg = await prisma.directMessage.findUnique({
          where: { id },
          select: { senderId: true, createdAt: true, conversationId: true, conversation: { select: { userAId: true, userBId: true } } },
        });
        if (!msg) { res.status(404).json({ error: "메시지 없음" }); return; }
        if (msg.senderId !== userId) { res.status(403).json({ error: "본인 메시지만 편집할 수 있습니다." }); return; }
        const ageMs = Date.now() - new Date(msg.createdAt).getTime();
        if (ageMs > 5 * 60 * 1000) {
          res.status(400).json({ error: "편집은 5분 이내 메시지만 가능합니다." }); return;
        }
        const updated = await prisma.directMessage.update({
          where: { id },
          data: { content },
        });
        const otherUserId = msg.conversation.userAId === userId ? msg.conversation.userBId : msg.conversation.userAId;
        emitToUser(otherUserId, "dm.message.edited", { conversationId: msg.conversationId, message: updated });
        res.json({ message: updated });
      } catch (err) {
        handleRouteError(res, err, "메시지 편집 오류");
      }
    },
  );

  /* ─── POST /api/dm/mark-all-read
     내 모든 대화방 한꺼번에 읽음 처리 */
  app.post(
    "/api/dm/mark-all-read",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const myConvs = await prisma.directConversation.findMany({
          where: { OR: [{ userAId: userId }, { userBId: userId }] },
          select: { id: true },
        });
        const ids = myConvs.map((c) => c.id);
        if (ids.length === 0) { res.json({ markedRead: 0 }); return; }
        const result = await prisma.directMessage.updateMany({
          where: {
            conversationId: { in: ids },
            senderId: { not: userId },
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        res.json({ markedRead: result.count });
      } catch (err) {
        handleRouteError(res, err, "전체 읽음 처리 오류");
      }
    },
  );

  /* ─── GET /api/dm/unread-summary
     사이드바 배지용: 전체 안 읽은 수 + 대화방 수 */
  app.get(
    "/api/dm/unread-summary",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        // 내가 속한 대화방의 ID 목록
        const myConvs = await prisma.directConversation.findMany({
          where: { OR: [{ userAId: userId }, { userBId: userId }] },
          select: { id: true },
        });
        const ids = myConvs.map((c) => c.id);
        const unreadTotal = ids.length
          ? await prisma.directMessage.count({
              where: {
                conversationId: { in: ids },
                senderId: { not: userId },
                readAt: null,
              },
            })
          : 0;
        res.json({ unreadTotal });
      } catch (err) {
        handleRouteError(res, err, "DM unread summary 오류");
      }
    },
  );
}
