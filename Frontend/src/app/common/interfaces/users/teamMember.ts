
import { Team } from "./team";
import { User } from "./user";

export interface TeamMember {
    id: number;
    teamId: number;
    userId: number;

    team: Team
    user: User
}
