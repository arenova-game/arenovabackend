import { Module } from '@nestjs/common';
import { ProofsService } from './proofs.service';
import { ProofsController } from './proofs.controller';

@Module({
  controllers: [ProofsController],
  providers: [ProofsService],
})
export class ProofsModule {}
