import { User } from "../users/user"
import { ExpenseStatus } from "./expense-status"
export interface Expense {
    id: number
    piNo: string
    expenseNumber : string
    url: string
    bankSlip : string
    status: string
    count: number
    notes:  string
    currency: string,
    amount: number

    userId: number
    paymentMode: string

    user: User
    manager: User
    ma: User

    expenseStatuses: ExpenseStatus[];
}
