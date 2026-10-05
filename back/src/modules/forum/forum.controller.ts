import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ForumService } from './forum.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { ReactPostDto } from './dto/react-post.dto';
import { CreateKnowledgeArticleDto } from './dto/create-article.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('forum')
export class ForumController {
  constructor(private forumService: ForumService) {}

  @Get('categories')
  listCategories() {
    return this.forumService.listCategories();
  }

  @Get('threads')
  listThreads() {
    return this.forumService.listThreads(false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/threads')
  listAdminThreads() {
    return this.forumService.listThreads(true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'FORUM_USER', 'ADMIN')
  @Get('my-threads')
  listMyThreads(@Req() req: any) {
    return this.forumService.listThreads(true, req.user.id);
  }

  @Get('threads/:id')
  getThread(@Param('id') id: string) {
    return this.forumService.getThread(id, false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/threads/:id')
  getAdminThread(@Param('id') id: string) {
    return this.forumService.getThread(id, true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'FORUM_USER', 'ADMIN')
  @Get('my-threads/:id')
  getMyThread(@Req() req: any, @Param('id') id: string) {
    return this.forumService.getThread(id, true, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'FORUM_USER')
  @Post('threads')
  createThread(@Req() req: any, @Body() dto: CreateThreadDto) {
    return this.forumService.createThread({ ...dto, authorId: req.user.id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'FORUM_USER')
  @Post('threads/:threadId/posts')
  createPost(@Req() req: any, @Param('threadId') threadId: string, @Body() dto: CreatePostDto) {
    return this.forumService.createPost(threadId, { ...dto, authorId: req.user.id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('threads/:id/status')
  updateThreadStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.forumService.updateThreadStatus(id, body.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('threads/:id/approval')
  approveThread(@Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.forumService.setThreadApproval(id, body.approved);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('posts/:id/approval')
  approvePost(@Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.forumService.setPostApproval(id, body.approved);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'FORUM_USER', 'ADMIN')
  @Post('posts/:postId/reactions')
  reactPost(@Param('postId') postId: string, @Body() dto: ReactPostDto) {
    return this.forumService.reactPost(postId, dto);
  }

  @Get('knowledge')
  listArticles() {
    return this.forumService.listArticles();
  }

  @Get('knowledge/:id')
  getArticle(@Param('id') id: string) {
    return this.forumService.getArticle(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('knowledge')
  createArticle(@Body() dto: CreateKnowledgeArticleDto) {
    return this.forumService.createArticle(dto);
  }
}
