import { EventEmitter } from 'events';


class TeamActivityEmitter extends EventEmitter {}

export const teamActivityEmitter = new TeamActivityEmitter();
