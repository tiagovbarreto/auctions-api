import AWS from 'aws-sdk';
import createError from 'http-errors';
import validator from '@middy/validator';

import commonMiddleware from '../lib/middleware';
import placeBidSchema from '../schemas/placeBidSchema';

import { getAuctionById } from './getAuction';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount } = event.body;
  const { email } = event.requestContext.authorizer;

  const auction = await getAuctionById(id);

  if (email === auction.seller) {
    throw new createError.UnprocessableEntity(
      'You cannot bid on your own auctions'
    );
  }

  if (email === auction.highestBid.bidder) {
    throw new createError.UnprocessableEntity(
      'You are already the highest bidder'
    );
  }

  if (auction.status !== 'OPEN') {
    throw new createError.UnprocessableEntity(
      'You cannot bid on closed auctions'
    );
  }

  if (amount <= auction.highestBid.amount) {
    throw new createError.UnprocessableEntity(
      `Your bid must be higher than ${auction.highestBid.amount}`
    );
  }

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression:
      'set highestBid.amount = :amount, highestBid.bidder = :bidder',
    ExpressionAttributeValues: {
      ':amount': amount,
      ':bidder': email,
    },
    ReturnValues: 'ALL_NEW',
  };

  let updatedAuction;

  try {
    const result = await dynamodb.update(params).promise();
    updatedAuction = result.Attributes;
  } catch (error) {
    console.log(error);
    throw new createError.InternalError(error);
  }

  return {
    statusCode: 201,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = commonMiddleware(placeBid).use(
  validator({ inputSchema: placeBidSchema })
);
