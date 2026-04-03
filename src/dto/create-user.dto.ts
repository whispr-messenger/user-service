import { IsString, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password_hash: string;

  @IsString()
  @IsNotEmpty()
  phone_number: string;
}
