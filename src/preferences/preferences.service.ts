import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserPreferences } from '../entities';
import { UpdatePreferencesDto } from '../dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreferences)
    private readonly prefsRepo: Repository<UserPreferences>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async get(userId: string): Promise<UserPreferences> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let prefs = await this.prefsRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.prefsRepo.create({
        userId,
        theme: 'dark',
        backgroundType: 'black',
        backgroundColor: '#000000',
        avatarUri: null,
        backgroundImageId: null,
      });
      prefs = await this.prefsRepo.save(prefs);
    }
    return prefs;
  }

  async update(userId: string, dto: UpdatePreferencesDto): Promise<UserPreferences> {
    const existing = await this.get(userId);
    Object.assign(existing, dto);
    return this.prefsRepo.save(existing);
  }
}