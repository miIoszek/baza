import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCompanyProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'NIP must be exactly 10 digits' })
  nip!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  baseLocation!: string;
}
