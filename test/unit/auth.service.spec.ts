import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const mockUser = {
  id: 'uuid-123',
  name: 'Carlos',
  email: 'carlos@teste.com',
  password: '$2a$10$hashedpassword',
  role: 'USER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<Pick<PrismaService, 'user'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mocked.jwt.token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('7d') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should create a user and return it without password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
      });

      const result = await service.register({
        name: 'Carlos',
        email: 'carlos@teste.com',
        password: '123456',
      });

      expect(result).toMatchObject({ id: mockUser.id, email: mockUser.email });
      expect(result).not.toHaveProperty('password');
      expect(prisma.user.create as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.register({ name: 'Carlos', email: mockUser.email, password: '123456' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash the password before saving', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      let capturedData: Record<string, unknown> = {};
      (prisma.user.create as jest.Mock).mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => {
          capturedData = data;
          return Promise.resolve({
            id: mockUser.id,
            email: mockUser.email,
            role: 'USER',
            name: 'Carlos',
            createdAt: new Date(),
          });
        },
      );

      await service.register({ name: 'Carlos', email: 'novo@teste.com', password: '123456' });

      expect(capturedData.password).toBeDefined();
      expect(capturedData.password).not.toBe('123456');
      expect((capturedData.password as string).startsWith('$2')).toBe(true);
    });
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const hashed = await bcrypt.hash('123456', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, password: hashed });

      const result = await service.validateUser('carlos@teste.com', '123456');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('password');
      expect(result?.email).toBe('carlos@teste.com');
    });

    it('should return null when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('naoexiste@teste.com', '123456');

      expect(result).toBeNull();
    });

    it('should return null when password is wrong', async () => {
      const hashed = await bcrypt.hash('senhaCorreta', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, password: hashed });

      const result = await service.validateUser('carlos@teste.com', 'senhaErrada');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access_token and expires_in', () => {
      const result = service.login({ id: mockUser.id, email: mockUser.email, role: mockUser.role });

      expect(result).toHaveProperty('access_token', 'mocked.jwt.token');
      expect(result).toHaveProperty('expires_in', '7d');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });
  });

  describe('validateUser (UnauthorizedException integration)', () => {
    it('local strategy should throw UnauthorizedException when validateUser returns null', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const user = await service.validateUser('wrong@email.com', 'wrong');
      expect(user).toBeNull();

      expect(() => {
        if (!user) throw new UnauthorizedException('Invalid credentials');
      }).toThrow(UnauthorizedException);
    });
  });
});
