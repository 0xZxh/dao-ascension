import { NextRequest, NextResponse } from "next/server";
import {
  challengePvpDuel,
  challengeSecretRealmFloor,
  claimAllCelestialMails,
  claimCelestialMailAttachment,
  createCustomCultivatorCharacter,
  equipArtifactToCultivator,
  forgeImmortalArtifact,
  getXianxiaWorldSnapshot,
  harvestAndRefinePill,
  plantHerbInPlot,
  readCelestialMail,
  rechargeSpiritStonesWithNear,
  resetXianxiaWorldState,
  reshapeDaoBody,
  rollSpiritRootWithNear,
  settleWeeklyHeavenLeaderboards,
  transferCultivatorNftAccount,
  waterPlotWithSpiritSpring,
} from "@/lib/xianxia/engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let accountId: string | undefined = undefined;
  try {
    const body = await req.json();
    const action = String(body.action || "");
    accountId = body.accountId ? String(body.accountId).trim() : undefined;
    let actionResult: unknown = null;

    switch (action) {
      case "CREATE_CHARACTER": {
        const validClasses = [
          "saintess",
          "sword",
          "venerable",
          "fox",
          "demon",
          "alchemy",
          "body",
        ] as const;
        const pickedClass = validClasses.includes(body.avatarClass)
          ? body.avatarClass
          : "saintess";
        createCustomCultivatorCharacter({
          daoName: String(body.daoName || "云清浅"),
          avatarClass: pickedClass,
          spiritRootName: String(body.spiritRootName || "天品剑灵根"),
          accountId,
        });
        actionResult = { created: true };
        break;
      }
      case "PLANT_HERB": {
        actionResult = plantHerbInPlot({
          plotId: Number(body.plotId ?? 0),
          seedTier: (Number(body.seedTier ?? 1) as 1 | 2 | 3) || 1,
          accountId,
        });
        break;
      }
      case "WATER_SPIRIT_SPRING": {
        actionResult = waterPlotWithSpiritSpring(Number(body.plotId ?? 0), accountId);
        break;
      }
      case "HARVEST_AND_REFINE": {
        actionResult = harvestAndRefinePill(Number(body.plotId ?? 0), accountId);
        break;
      }
      case "FORGE_ARTIFACT": {
        actionResult = forgeImmortalArtifact(
          String(body.blueprintId || "bp-bamboo-sword"),
          accountId
        );
        break;
      }
      case "EQUIP_ARTIFACT": {
        actionResult = equipArtifactToCultivator(String(body.artifactId || ""), accountId);
        break;
      }
      case "CHALLENGE_REALM": {
        actionResult = challengeSecretRealmFloor(Number(body.floor ?? 1), accountId);
        break;
      }
      case "CHALLENGE_PVP_DUEL": {
        actionResult = challengePvpDuel({
          opponentId: String(body.opponentId || "pvp-medium-chiyan"),
          accountId,
        });
        break;
      }
      case "SETTLE_WEEKLY_BOARDS": {
        actionResult = await settleWeeklyHeavenLeaderboards({
          destinationChain: body.destinationChain || "sol",
          destinationSymbol: body.destinationSymbol || "USDC",
          recipientAddress: body.recipientAddress,
          forceSettle:
            process.env.NODE_ENV === "development"
              ? Boolean(body.forceSettle)
              : false,
          accountId,
        });
        break;
      }
      case "TRANSFER_NFT_ACCOUNT": {
        actionResult = transferCultivatorNftAccount(
          String(body.newOwnerAccountId || "immortal-buyer.testnet"),
          accountId
        );
        break;
      }
      case "RESET_WORLD": {
        resetXianxiaWorldState(accountId);
        actionResult = { reset: true };
        break;
      }
      case "READ_MAIL": {
        actionResult = readCelestialMail(String(body.mailId || ""), accountId);
        break;
      }
      case "CLAIM_MAIL_ATTACHMENT": {
        actionResult = claimCelestialMailAttachment(String(body.mailId || ""), accountId);
        break;
      }
      case "CLAIM_ALL_MAILS": {
        actionResult = claimAllCelestialMails(accountId);
        break;
      }
      case "ROLL_SPIRIT_ROOT": {
        actionResult = rollSpiritRootWithNear({ accountId });
        break;
      }
      case "RESHAPE_DAO_BODY": {
        const validClasses = [
          "saintess",
          "sword",
          "venerable",
          "fox",
          "demon",
        ] as const;
        const pickedClass = validClasses.includes(body.avatarClass)
          ? body.avatarClass
          : "saintess";
        actionResult = reshapeDaoBody({
          accountId,
          newAvatarClass: pickedClass,
          newDaoName: String(body.daoName || ""),
          paymentMethod: body.paymentMethod,
        });
        break;
      }
      case "RECHARGE_SPIRIT_STONES": {
        actionResult = rechargeSpiritStonesWithNear({
          accountId,
          nearAmount: Number(body.nearAmount || 1.0),
        });
        break;
      }
      default:
        return NextResponse.json(
          { ok: false, error: `未知操作类型: ${action}` },
          { status: 400 }
        );
    }

    const snapshot = await getXianxiaWorldSnapshot(accountId);
    return NextResponse.json({
      ok: true,
      action,
      actionResult,
      snapshot,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "执行修仙指令异常";
    const snapshot = await getXianxiaWorldSnapshot(accountId);
    return NextResponse.json(
      { ok: false, error: message, snapshot },
      { status: 400 }
    );
  }
}
