import { ForumController } from './forum.controller';

describe('ForumController', () => {
  let controller: ForumController;
  let forum: Record<string, jest.Mock>;
  const req = { user: { id: 'u1' } };

  beforeEach(() => {
    forum = {
      listCategories: jest.fn(),
      listThreads: jest.fn(),
      getThread: jest.fn(),
      createThread: jest.fn(),
      createPost: jest.fn(),
      updateThreadStatus: jest.fn(),
      setThreadApproval: jest.fn(),
      setPostApproval: jest.fn(),
      reactPost: jest.fn(),
      listArticles: jest.fn(),
      getArticle: jest.fn(),
      createArticle: jest.fn(),
    };
    controller = new ForumController(forum as any);
  });

  it('listCategories delegates', () => {
    controller.listCategories();
    expect(forum.listCategories).toHaveBeenCalled();
  });

  it('listThreads returns only approved threads', () => {
    controller.listThreads();
    expect(forum.listThreads).toHaveBeenCalledWith(false);
  });

  it('listAdminThreads includes unapproved threads', () => {
    controller.listAdminThreads();
    expect(forum.listThreads).toHaveBeenCalledWith(true);
  });

  it('listMyThreads filters by the authenticated user', () => {
    controller.listMyThreads(req);
    expect(forum.listThreads).toHaveBeenCalledWith(true, 'u1');
  });

  it('getThread is public and hides unapproved content', () => {
    controller.getThread('t1');
    expect(forum.getThread).toHaveBeenCalledWith('t1', false);
  });

  it('getAdminThread includes unapproved content', () => {
    controller.getAdminThread('t1');
    expect(forum.getThread).toHaveBeenCalledWith('t1', true);
  });

  it('getMyThread scopes to the author', () => {
    controller.getMyThread(req, 't1');
    expect(forum.getThread).toHaveBeenCalledWith('t1', true, 'u1');
  });

  it('createThread sets the author from the token', () => {
    controller.createThread(req, { title: 'T', categoryId: 'c', content: 'x' });
    expect(forum.createThread).toHaveBeenCalledWith({ title: 'T', categoryId: 'c', content: 'x', authorId: 'u1' });
  });

  it('createPost sets the author from the token', () => {
    controller.createPost(req, 't1', { content: 'hola' });
    expect(forum.createPost).toHaveBeenCalledWith('t1', { content: 'hola', authorId: 'u1' });
  });

  it('updateThreadStatus forwards the status', () => {
    controller.updateThreadStatus('t1', { status: 'CLOSED' });
    expect(forum.updateThreadStatus).toHaveBeenCalledWith('t1', 'CLOSED');
  });

  it('approveThread and approvePost forward the flag', () => {
    controller.approveThread('t1', { approved: true });
    controller.approvePost('p1', { approved: false });
    expect(forum.setThreadApproval).toHaveBeenCalledWith('t1', true);
    expect(forum.setPostApproval).toHaveBeenCalledWith('p1', false);
  });

  it('reactPost forwards the reaction', () => {
    controller.reactPost('p1', { type: 'LIKE' });
    expect(forum.reactPost).toHaveBeenCalledWith('p1', { type: 'LIKE' });
  });

  it('knowledge endpoints delegate to the service', () => {
    const dto = { title: 'a', summary: 'b', content: 'c', category: 'd' };
    controller.listArticles();
    controller.getArticle('1');
    controller.createArticle(dto);
    expect(forum.listArticles).toHaveBeenCalled();
    expect(forum.getArticle).toHaveBeenCalledWith('1');
    expect(forum.createArticle).toHaveBeenCalledWith(dto);
  });
});
