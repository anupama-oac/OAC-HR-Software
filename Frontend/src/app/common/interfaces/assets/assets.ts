export interface Assets {
    id: number;
    assetName: string;
    assetNumber?: string;
    assetHandoverNumber?: string;
    description?: string;
    serialNumber?: string;
    purchasedDate?: Date | string;
    purchasedFrom?: string;
    invoiceNo?: string;
    status?: boolean;
    assignedStatus?: boolean;
    noOfItems?: number;
}
