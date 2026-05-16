import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";
import { sanitizeText } from "../lib/validation.js";

type RegisterCommunityRoutesOptions = {
  prisma: PrismaClient;
};

export function registerCommunityRoutes(
  app: Express,
  { prisma }: RegisterCommunityRoutesOptions,
): void {
  app.post("/api/community/posts", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const { category = "FREE_TALK", ideaId } = req.body;
      const title = sanitizeText(req.body.title);
      const content = sanitizeText(req.body.content);

      if (!title || !content) {
        res.status(400).json({ error: "title과 content는 필수입니다." });
        return;
      }

      const validCategories = ["IDEA_SHARE", "QUESTION", "CASE_STUDY", "TEAM_RECRUIT", "OUTSOURCE_REQUEST", "AC_REQUEST", "MENTOR_REQUEST", "BETA_TESTER", "FREE_TALK"];
      const resolvedCategory = validCategories.includes(category) ? category : "FREE_TALK";

      // ideaId 유효성 확인 (있을 때만)
      let resolvedIdeaId: string | undefined;
      if (ideaId && typeof ideaId === "string") {
        const idea = await prisma.generatedIdea.findUnique({ where: { id: ideaId }, select: { id: true } });
        if (idea) resolvedIdeaId = idea.id;
      }

      const post = await prisma.communityPost.create({
        data: { title, content, category: resolvedCategory, authorId: userId, ideaId: resolvedIdeaId },
        include: {
          author: { select: { id: true, name: true, email: true } },
          idea:   { select: { id: true, titleKo: true } },
          _count: { select: { comments: true, likes: true } },
        },
      });

      res.status(201).json(post);
    } catch (err) {
      handleRouteError(res, err, "게시글 작성 오류");
    }
  });

  app.get("/api/community/posts", async (req: Request, res: Response): Promise<void> => {
    try {
      const category = req.query.category as string | undefined;
      const q = String(req.query.q ?? "").trim();
      const authorId = String(req.query.authorId ?? "").trim();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (category) where.category = category;
      if (authorId) where.authorId = authorId;
      if (q.length > 0) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ];
      }

      const [posts, total] = await Promise.all([
        prisma.communityPost.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            author: { select: { id: true, name: true, email: true } },
            idea:   { select: { id: true, titleKo: true } },
            _count: { select: { comments: true, likes: true } },
          },
        }),
        prisma.communityPost.count({ where }),
      ]);

      res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      handleRouteError(res, err, "게시글 목록 조회 오류");
    }
  });

  app.get("/api/community/posts/:id", async (req: Request, res: Response): Promise<void> => {
    try {
      const post = await prisma.communityPost.update({
        where: { id: String(req.params.id) },
        data: { viewCount: { increment: 1 } },
        include: {
          author: { select: { id: true, name: true, email: true } },
          idea:   { select: { id: true, titleKo: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { id: true, name: true, email: true } } },
          },
          _count: { select: { likes: true } },
        },
      });
      res.json(post);
    } catch {
      res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    }
  });

  app.delete("/api/community/posts/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const post = await prisma.communityPost.findUnique({ where: { id: String(req.params.id) } });
      if (!post || post.authorId !== userId) {
        res.status(404).json({ error: "게시글을 찾을 수 없거나 권한이 없습니다." });
        return;
      }
      await prisma.communityPost.delete({ where: { id: String(req.params.id) } });
      res.json({ deleted: true });
    } catch (err) {
      handleRouteError(res, err, "게시글 삭제 오류");
    }
  });

  app.post("/api/community/posts/:id/comments", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const content = sanitizeText(req.body.content);
      if (!content) {
        res.status(400).json({ error: "content는 필수입니다." });
        return;
      }

      const comment = await prisma.postComment.create({
        data: { content, authorId: userId, postId: String(req.params.id) },
        include: { author: { select: { id: true, name: true, email: true } } },
      });
      res.status(201).json(comment);
    } catch (err) {
      handleRouteError(res, err, "댓글 작성 오류");
    }
  });

  app.delete("/api/community/posts/:postId/comments/:commentId", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const comment = await prisma.postComment.findUnique({ where: { id: String(req.params.commentId) } });
      if (!comment || comment.authorId !== userId) {
        res.status(404).json({ error: "댓글을 찾을 수 없거나 권한이 없습니다." });
        return;
      }
      await prisma.postComment.delete({ where: { id: String(req.params.commentId) } });
      res.json({ deleted: true });
    } catch (err) {
      handleRouteError(res, err, "댓글 삭제 오류");
    }
  });

  app.post("/api/community/posts/:id/like", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const postId = String(req.params.id);

      const existing = await prisma.postLike.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existing) {
        await prisma.postLike.delete({ where: { id: existing.id } });
        const count = await prisma.postLike.count({ where: { postId } });
        res.json({ liked: false, likeCount: count });
        return;
      }

      await prisma.postLike.create({ data: { userId, postId } });
      const count = await prisma.postLike.count({ where: { postId } });
      res.json({ liked: true, likeCount: count });
    } catch (err) {
      handleRouteError(res, err, "좋아요 처리 오류");
    }
  });

  app.get("/api/ac/founders", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
      const skip = (page - 1) * limit;

      const where = { category: { in: ["TEAM_RECRUIT", "IDEA_SHARE"] as any[] } };

      const [posts, total, bookmarked] = await Promise.all([
        prisma.communityPost.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            author: { select: { id: true, name: true, email: true } },
            idea:   { select: { id: true, titleKo: true } },
            _count: { select: { comments: true, likes: true } },
          },
        }),
        prisma.communityPost.count({ where }),
        prisma.acceleratorBookmark.findMany({
          where: { userId },
          select: { postId: true },
        }),
      ]);

      const bookmarkedIds = new Set(bookmarked.map((bookmark) => bookmark.postId));

      res.json({
        posts: posts.map((post) => ({ ...post, bookmarked: bookmarkedIds.has(post.id) })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      handleRouteError(res, err, "액셀러레이터 후보 조회 오류");
    }
  });

  app.post("/api/ac/bookmarks/:postId", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const postId = String(req.params.postId);

      const existing = await prisma.acceleratorBookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existing) {
        await prisma.acceleratorBookmark.delete({ where: { id: existing.id } });
        res.json({ bookmarked: false, postId });
        return;
      }

      await prisma.acceleratorBookmark.create({ data: { userId, postId } });
      res.json({ bookmarked: true, postId });
    } catch (err) {
      handleRouteError(res, err, "액셀러레이터 북마크 오류");
    }
  });

  app.get("/api/ac/bookmarks", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);

      const bookmarks = await prisma.acceleratorBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            include: {
              author: { select: { id: true, name: true, email: true } },
              idea:   { select: { id: true, titleKo: true } },
              _count: { select: { comments: true, likes: true } },
            },
          },
        },
      });

      res.json(
        bookmarks.map((bookmark) => ({
          ...bookmark.post,
          bookmarked: true,
          bookmarkedAt: bookmark.createdAt,
        })),
      );
    } catch (err) {
      handleRouteError(res, err, "액셀러레이터 북마크 목록 오류");
    }
  });
}
