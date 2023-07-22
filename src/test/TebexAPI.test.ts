import { TebexAPI } from '../API/External/TebexAPI';
const config = require("../../config.json");

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: 'test data' }),
  }),
) as jest.Mock;


describe('TebexAPI tests', () => {
  it('should return the correct response for getPaymentFromId', async () => {
    const result = await TebexAPI.getPaymentFromId('123', "456");
    const headers = new Headers();
    headers.append("X-Tebex-Secret", "123");
    expect(fetch).toHaveBeenCalledWith(config.TEBEX_URL + '/payments/456', {
      method: "GET",
      headers: headers
    });
    expect(result).toEqual({ data: 'test data' });
  });
  it('should return the correct response for getPaymentFromId', async () => {
    const result = await TebexAPI.getPaymentFromId('123', "456");
    const headers = new Headers();
    headers.append("X-Tebex-Secret", "123");
    expect(fetch).toHaveBeenCalledWith(config.TEBEX_URL + '/payments/456', {
      method: "GET",
      headers: headers
    });
    expect(result).toEqual({ data: 'test data' });
  });
});
