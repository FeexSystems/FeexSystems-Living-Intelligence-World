import { EventEmitter } from 'events';
import { TeamActivityLog } from '@prisma/client';

class TeamActivityEmitter extends EventEmitter {}

export const teamActivityEmitter = new TeamActivityEmitter();
