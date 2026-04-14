import { Injectable } from '@nestjs/common';
import { ReputationRepository } from '../repositories/reputation.repository';
import { UserReputation } from '../entities/user-reputation.entity';

const SCORE_MIN = 0;
const SCORE_MAX = 100;

const SANCTION_SCORE_MAP: Record<string, number> = {
	warning: -10,
	temp_ban: -25,
	perm_ban: -50,
};

function clampScore(score: number): number {
	return Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
}

@Injectable()
export class ReputationService {
	constructor(private readonly reputationRepository: ReputationRepository) {}

	async getReputation(userId: string): Promise<UserReputation> {
		const existing = await this.reputationRepository.findByUserId(userId);
		if (existing) {
			return existing;
		}
		return this.reputationRepository.create({
			userId,
			score: SCORE_MAX,
			totalReportsReceived: 0,
			totalReportsFiled: 0,
			totalSanctions: 0,
			totalAppeals: 0,
			appealsAccepted: 0,
			lastSanctionAt: null,
		});
	}

	async updateOnReportReceived(userId: string): Promise<UserReputation> {
		const rep = await this.getReputation(userId);
		rep.score = clampScore(rep.score - 5);
		rep.totalReportsReceived += 1;
		return this.reputationRepository.save(rep);
	}

	async updateOnSanctionApplied(
		userId: string,
		type: 'warning' | 'temp_ban' | 'perm_ban'
	): Promise<UserReputation> {
		const rep = await this.getReputation(userId);
		const penalty = SANCTION_SCORE_MAP[type] || -10;
		rep.score = clampScore(rep.score + penalty);
		rep.totalSanctions += 1;
		rep.lastSanctionAt = new Date();
		return this.reputationRepository.save(rep);
	}

	async updateOnAppealAccepted(userId: string): Promise<UserReputation> {
		const rep = await this.getReputation(userId);
		rep.score = clampScore(rep.score + 15);
		rep.totalAppeals += 1;
		rep.appealsAccepted += 1;
		return this.reputationRepository.save(rep);
	}

	async updateOnAppealRejected(userId: string): Promise<UserReputation> {
		const rep = await this.getReputation(userId);
		rep.score = clampScore(rep.score - 5);
		rep.totalAppeals += 1;
		return this.reputationRepository.save(rep);
	}

	async updateOnReportFiled(userId: string): Promise<UserReputation> {
		const rep = await this.getReputation(userId);
		rep.totalReportsFiled += 1;
		return this.reputationRepository.save(rep);
	}

	async recalculateScore(userId: string): Promise<UserReputation> {
		const rep = await this.getReputation(userId);
		let score = SCORE_MAX;
		score -= rep.totalReportsReceived * 5;
		score -= rep.totalSanctions * 15;
		score += rep.appealsAccepted * 15;
		rep.score = clampScore(score);
		return this.reputationRepository.save(rep);
	}
}
