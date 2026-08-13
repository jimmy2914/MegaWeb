import { IsEnum, IsNotEmpty } from 'class-validator';

export class ReactPostDto {
  @IsNotEmpty()
  @IsEnum(['LIKE', 'LOVE', 'UPVOTE', 'DOWNVOTE'])
  type: 'LIKE' | 'LOVE' | 'UPVOTE' | 'DOWNVOTE';
}
