import { RebalanceOutput } from "@/core/rebalance/rebalance";
import { DesiredUsdAllocation, InputItem } from "@/core/rebalance/input";

export function determineRebalanceActions(got: InputItem[], want: DesiredUsdAllocation[]): RebalanceOutput {
    let logs: string[] = [];

    // todo 

    return {
        valid: true,
        uuid: crypto.randomUUID(),
        createdAt: new Date(),
        actions: [],
        logs: logs
    }
}
