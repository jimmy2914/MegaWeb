import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface KnowledgeArticleEntity {
  id: string;
  title: string;
  body: string;
  authorId: string;
  publishedAt: string;
}

@Injectable()
export class ForumService {
  private articles: KnowledgeArticleEntity[] = [];

  constructor(private prisma: PrismaService) {}

  async listCategories() {
    const dbCategories = await this.prisma.category.findMany();
    return { categories: dbCategories.map(c => c.name) };
  }

  async listThreads(includeUnapproved = false, authorId?: string) {
    const threads = await this.prisma.thread.findMany({
      where: authorId
        ? { authorId }
        : includeUnapproved
          ? undefined
          : { approved: true },
      include: {
        category: true,
        author: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { threads, total: threads.length, page: 1, limit: threads.length };
  }

  async getThread(id: string, includeUnapproved = false, authorId?: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      include: {
        category: true,
        author: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });
    if (!thread || (!includeUnapproved && !thread.approved) || (authorId && thread.authorId !== authorId)) {
      throw new NotFoundException('Thread not found');
    }
    const posts = await this.prisma.post.findMany({
      where: includeUnapproved ? { threadId: id } : { threadId: id, approved: true },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    return { thread, posts };
  }

  async createThread(data: any) {
    const catId = data.categoryId || 'general';
    await this.prisma.category.upsert({
      where: { id: catId },
      update: {},
      create: { id: catId, name: catId.charAt(0).toUpperCase() + catId.slice(1) }
    });

    return this.prisma.thread.create({
      data: {
        title: data.title,
        content: data.content,
        categoryId: catId,
        authorId: data.authorId,
        status: 'OPEN'
        , approved: false
      }
    });
  }

  async createPost(threadId: string, data: any) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.status === 'CLOSED') throw new Error('Thread is closed');

    return this.prisma.post.create({
      data: {
        content: data.content,
        threadId,
        authorId: data.authorId,
        approved: false
      }
    });
  }

  async updateThreadStatus(id: string, status: string) {
    if (!['OPEN', 'CLOSED'].includes(status)) {
      throw new Error('Invalid thread status');
    }
    const thread = await this.prisma.thread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread not found');
    return this.prisma.thread.update({ where: { id }, data: { status } });
  }

  async setThreadApproval(id: string, approved: boolean) {
    const thread = await this.prisma.thread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread not found');
    return this.prisma.thread.update({ where: { id }, data: { approved: Boolean(approved) } });
  }

  async setPostApproval(id: string, approved: boolean) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.post.update({ where: { id }, data: { approved: Boolean(approved) } });
  }

  reactPost(postId: string, data: any) {
    return { id: String(Date.now()), postId, ...data };
  }

  listArticles() {
    return { articles: this.articles, total: this.articles.length, page: 1, limit: this.articles.length };
  }

  getArticle(id: string) {
    const article = this.articles.find((item) => item.id === id);
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  createArticle(data: any) {
    const article = { ...data, id: String(this.articles.length + 1), publishedAt: new Date().toISOString() };
    this.articles.push(article);
    return article;
  }
}
