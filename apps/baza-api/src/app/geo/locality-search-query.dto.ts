import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  LOCALITY_QUERY_MAX_LENGTH,
  LOCALITY_QUERY_MIN_LENGTH,
} from '@baza/shared-types';

export class LocalitySearchQueryDto {
  @IsString()
  @MinLength(LOCALITY_QUERY_MIN_LENGTH)
  @MaxLength(LOCALITY_QUERY_MAX_LENGTH)
  q!: string;
}
