export interface CreateUserDto {
  email: string;
  name?: string;
}

export interface UpdateUserDto {
  name?: string;
}
