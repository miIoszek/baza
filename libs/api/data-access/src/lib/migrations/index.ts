import { DomainSchema1789700000002 } from './1789700000002-DomainSchema';
import { IdentitySchema1789700000001 } from './1789700000001-IdentitySchema';

/** Order matters only through the timestamp suffix; append new migrations at the end. */
export const ALL_MIGRATIONS = [
  IdentitySchema1789700000001,
  DomainSchema1789700000002,
];
