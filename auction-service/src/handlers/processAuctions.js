import { getEndedAuctions } from '../lib/getEndedAuctions';
import { closeAuction } from '../lib/closeAuction';
import createError from 'http-errors';

async function processAuctions(event, context) {
  try {
    const auctionsToClose = await getEndedAuctions();
    const closePromisses = auctionsToClose.map((auction) =>
      closeAuction(auction)
    );
    await Promise.all(closePromisses);
    return { close: closePromisses.length };
  } catch (error) {
    console.log(error);
    throw createError.InternalServerError(error);
  }
}

export const handler = processAuctions;
