import { execute, Shopy } from '../Database';
import { encrypt, decrypt } from '../Util/Crypto';
import { Queries } from '../Queries';
import { ResultSetHeader } from 'mysql2';

export const newGuild = async (
  guildId: string | null,
  name: string | undefined,
): Promise<boolean> => {
  const query: ResultSetHeader = await execute(Shopy, Queries.NewGuild, [
    guildId,
    name,
  ]);
  return query.affectedRows > 0;
};

export const leaveGuild = async (guildId: string): Promise<boolean> => {
  const query: ResultSetHeader = await execute(Shopy, Queries.LeaveGuild, [
    guildId,
  ]);
  return query.affectedRows > 0;
};

export const updateToken = async (
  guildId: string | null,
  tkn: string,
): Promise<boolean> => {
  const { token, iv } = encrypt(tkn);
  const query: ResultSetHeader = await execute(Shopy, Queries.UpdateToken, [
    token,
    iv,
    guildId,
  ]);
  return query.affectedRows > 0;
};

export const getServerInformation = async (
  guildId: string,
): Promise<IServer> => {
  const info = await execute<IGuilds[]>(Shopy, Queries.GetGuildData, [guildId]);
  if (info.length <= 0 || info[0].setup === 0)
    return {
      setup: 0,
      token: '',
    };

  const token = decrypt(info[0].token, info[0].hash);
  return {
    setup: 1,
    token: token,
  };
};

interface IGuilds {
  setup: number;
  token: string;
  hash: string;
}

interface IServer {
  setup: number;
  token: string;
}
