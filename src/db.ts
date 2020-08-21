import { createHash } from 'crypto';

export interface IUser {
  _id: number;
  sid: string;
  username: string;
  password: string;
  isAdmin: boolean;
}

const userList: IUser[] = [
  {
    _id: 356,
    sid: createHash('sha256').update('356').digest('hex'),
    username: 'admin',
    password: 'secret-password-for-admin',
    isAdmin: true,
  },
  {
    _id: 4856,
    sid: createHash('sha256').update('4856').digest('hex'),
    username: 'test-user',
    password: 'secret-password-for-test-user',
    isAdmin: false,
  },
];

export const createUser = ({ username, password, isAdmin }: Partial<IUser>) => {
  if (userList.find((x) => x.username === username)) {
    return 'Username is in use';
  }

  const _id = userList.length;

  userList.push({
    _id,
    sid: createHash('sha256')
      .update('' + _id)
      .digest('hex'),
    username,
    password,
    isAdmin,
  });

  return userList[userList.length - 1];
};

export const findUser = (username: string) => {
  return userList.find((x) => x.username === username);
};

export const findSession = (sid: string) => {
  return userList.find((x) => x.sid === sid);
};
