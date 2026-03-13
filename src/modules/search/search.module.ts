import { Module } from '@nestjs/common';
import { SearchController } from './controllers/search.controller';

@Module({
	controllers: [SearchController],
})
export class SearchModule {}
