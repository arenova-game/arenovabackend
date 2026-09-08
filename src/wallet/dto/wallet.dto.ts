import { ApiProperty } from '@nestjs/swagger';

export class HoldEscrowDto {
  @ApiProperty({ description: 'Montant en OVA à bloquer', example: 100 })
  amount: number;
}

export class AdjustBalanceDto {
  @ApiProperty({ description: 'Montant à ajouter ou retirer', example: 500 })
  amount: number;

  @ApiProperty({ description: 'Raison de l ajustement', example: 'Récompense événement' })
  reason: string;
}
