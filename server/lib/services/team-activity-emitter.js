import { EventEmitter } from 'events';
import '@prisma/client';

class TeamActivityEmitter extends EventEmitter {}

export const teamActivityEmitter = new TeamActivityEmitter();
