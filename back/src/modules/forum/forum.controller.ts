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
    return this.forumService.listThreads();
  }

  @Get('threads/:id')
  getThread(@Param('id') id: string) {
    return this.forumService.getThread(id);
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
