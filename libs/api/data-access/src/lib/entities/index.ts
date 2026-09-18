import { AuthOneTimeToken } from './auth-one-time-token.entity';
import { Company } from './company.entity';
import { JobApplication } from './job-application.entity';
import { JobOffer } from './job-offer.entity';
import { RefreshToken } from './refresh-token.entity';
import { UserAccount } from './user-account.entity';

export * from './auth-one-time-token.entity';
export * from './company.entity';
export * from './job-application.entity';
export * from './job-offer.entity';
export * from './refresh-token.entity';
export * from './user-account.entity';

export const ALL_ENTITIES = [
  UserAccount,
  RefreshToken,
  AuthOneTimeToken,
  Company,
  JobOffer,
  JobApplication,
];
