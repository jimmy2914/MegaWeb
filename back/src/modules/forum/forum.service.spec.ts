import { NotFoundException } from '@nestjs/common';
import { ForumService } from './forum.service';

describe('ForumService', () => {
  let service: ForumService;
  let prisma: {
    category: Record<string, jest.Mock>;
    thread: Record<string, jest.Mock>;
    post: Record<string, jest.Mock>;
  };

  beforeEach(() => {
    prisma = {
      category: { findMany: jest.fn(), upsert: jest.fn() },
      thread: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      post: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    service = new ForumService(prisma as any);
  });

  it('listCategories returns only the names', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: 'a', name: 'General' }, { id: 'b', name: 'Solar' }]);
    await expect(service.listCategories()).resolves.toEqual({ categories: ['General', 'Solar'] });
  });

  describe('listThreads', () => {
    beforeEach(() => prisma.thread.findMany.mockResolvedValue([{ id: 't1' }]));

    it('shows only approved threads by default', async () => {
      await service.listThreads();
      expect(prisma.thread.findMany.mock.calls[0][0].where).toEqual({ approved: true });
    });

    it('shows every thread when unapproved ones are included', async () => {
      await service.listThreads(true);
      expect(prisma.thread.findMany.mock.calls[0][0].where).toBeUndefined();
    });

    it('filters by author when an author id is given', async () => {
      const result = await service.listThreads(true, 'u1');
      expect(prisma.thread.findMany.mock.calls[0][0].where).toEqual({ authorId: 'u1' });
      expect(result).toMatchObject({ total: 1, page: 1, limit: 1 });
    });
  });

  describe('getThread', () => {
    const thread = { id: 't1', approved: true, authorId: 'u1' };

    it('returns the thread with its approved posts', async () => {
      prisma.thread.findUnique.mockResolvedValue(thread);
      prisma.post.findMany.mockResolvedValue([{ id: 'p1' }]);
      const result = await service.getThread('t1');
      expect(result).toEqual({ thread, posts: [{ id: 'p1' }] });
      expect(prisma.post.findMany.mock.calls[0][0].where).toEqual({ threadId: 't1', approved: true });
    });

    it('includes unapproved posts for moderators', async () => {
      prisma.thread.findUnique.mockResolvedValue({ ...thread, approved: false });
      prisma.post.findMany.mockResolvedValue([]);
      await service.getThread('t1', true);
      expect(prisma.post.findMany.mock.calls[0][0].where).toEqual({ threadId: 't1' });
    });

    it('throws NotFoundException when the thread is missing', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);
      await expect(service.getThread('nope')).rejects.toThrow(NotFoundException);
    });

    it('hides unapproved threads from the public', async () => {
      prisma.thread.findUnique.mockResolvedValue({ ...thread, approved: false });
      await expect(service.getThread('t1', false)).rejects.toThrow(NotFoundException);
    });

    it('hides threads from users who are not the author', async () => {
      prisma.thread.findUnique.mockResolvedValue(thread);
      await expect(service.getThread('t1', true, 'other')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createThread', () => {
    it('upserts the category with a capitalized name and creates an unapproved open thread', async () => {
      prisma.thread.create.mockImplementation(async ({ data }) => data);
      const created = await service.createThread({ title: 'T', content: 'C', categoryId: 'solar', authorId: 'u1' });
      expect(prisma.category.upsert).toHaveBeenCalledWith({
        where: { id: 'solar' },
        update: {},
        create: { id: 'solar', name: 'Solar' },
      });
      expect(created).toMatchObject({ categoryId: 'solar', status: 'OPEN', approved: false, authorId: 'u1' });
    });

    it('defaults to the "general" category', async () => {
      prisma.thread.create.mockImplementation(async ({ data }) => data);
      const created = await service.createThread({ title: 'T', content: 'C', authorId: 'u1' });
      expect(created.categoryId).toBe('general');
    });
  });

  describe('createPost', () => {
    it('creates an unapproved post in an open thread', async () => {
      prisma.thread.findUnique.mockResolvedValue({ id: 't1', status: 'OPEN' });
      prisma.post.create.mockImplementation(async ({ data }) => data);
      const post = await service.createPost('t1', { content: 'hola', authorId: 'u1' });
      expect(post).toEqual({ content: 'hola', threadId: 't1', authorId: 'u1', approved: false });
    });

    it('throws NotFoundException when the thread is missing', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);
      await expect(service.createPost('nope', {})).rejects.toThrow(NotFoundException);
    });

    it('rejects posts in a closed thread', async () => {
      prisma.thread.findUnique.mockResolvedValue({ id: 't1', status: 'CLOSED' });
      await expect(service.createPost('t1', {})).rejects.toThrow('Thread is closed');
    });
  });

  describe('updateThreadStatus', () => {
    it('rejects invalid statuses', async () => {
      await expect(service.updateThreadStatus('t1', 'WHATEVER')).rejects.toThrow('Invalid thread status');
    });

    it('throws NotFoundException when the thread is missing', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);
      await expect(service.updateThreadStatus('t1', 'CLOSED')).rejects.toThrow(NotFoundException);
    });

    it('updates the status', async () => {
      prisma.thread.findUnique.mockResolvedValue({ id: 't1' });
      prisma.thread.update.mockResolvedValue({ id: 't1', status: 'CLOSED' });
      await service.updateThreadStatus('t1', 'CLOSED');
      expect(prisma.thread.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { status: 'CLOSED' } });
    });
  });

  describe('approvals', () => {
    it('setThreadApproval updates the thread', async () => {
      prisma.thread.findUnique.mockResolvedValue({ id: 't1' });
      prisma.thread.update.mockResolvedValue({});
      await service.setThreadApproval('t1', true);
      expect(prisma.thread.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { approved: true } });
    });

    it('setThreadApproval throws NotFoundException when missing', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);
      await expect(service.setThreadApproval('nope', true)).rejects.toThrow(NotFoundException);
    });

    it('setPostApproval updates the post', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.post.update.mockResolvedValue({});
      await service.setPostApproval('p1', false);
      expect(prisma.post.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { approved: false } });
    });

    it('setPostApproval throws NotFoundException when missing', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expect(service.setPostApproval('nope', true)).rejects.toThrow(NotFoundException);
    });
  });

  it('reactPost echoes the reaction with the post id', () => {
    expect(service.reactPost('p1', { type: 'LIKE' })).toMatchObject({ postId: 'p1', type: 'LIKE' });
  });

  describe('knowledge articles', () => {
    it('starts empty', () => {
      expect(service.listArticles()).toEqual({ articles: [], total: 0, page: 1, limit: 0 });
    });

    it('creates and retrieves an article', () => {
      const created = service.createArticle({ title: 'Guía' });
      expect(created).toMatchObject({ id: '1', title: 'Guía' });
      expect(service.getArticle('1')).toEqual(created);
      expect(service.listArticles().total).toBe(1);
    });

    it('throws NotFoundException for an unknown article', () => {
      expect(() => service.getArticle('99')).toThrow(NotFoundException);
    });
  });
});
