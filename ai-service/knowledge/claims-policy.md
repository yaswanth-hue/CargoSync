# Who can claim

Only the assigned driver can submit a claim, and only for a trip that is COMPLETED. There are two claim types: EXTRA_KM and WAITING_TIME. A driver can submit at most one claim of each type per trip.

# EXTRA_KM claims are validated by the rules engine

EXTRA_KM claims are validated automatically against the GPS trail. The actual distance is the sum of Haversine distances between consecutive GPS points. The claim is APPROVED if the claimed km is at most the actual GPS distance plus a 10 percent tolerance. Otherwise it is REJECTED, and the verdict states how many km the claim exceeds the allowed distance.

If the trip has fewer than 2 GPS points, the claim cannot be validated automatically and stays PENDING for manual review by a coordinator.

# WAITING_TIME claims

WAITING_TIME claims are never auto-decided. They always stay PENDING for manual review by a coordinator.

# Manual review

Admins and coordinators can approve or reject any claim that is still PENDING. A claim that is already APPROVED or REJECTED cannot be changed. The verdict text records whether the decision was automatic or manual. Automatic verdicts come from the rules engine, not from the AI assistant.