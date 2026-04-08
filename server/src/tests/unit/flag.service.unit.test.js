import crypto from 'crypto'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'

const mockTaskFindOne = jest.fn()
const mockProgressFindOne = jest.fn()
const mockProgressFindOneAndUpdate = jest.fn()
const mockGetRedisClient = jest.fn()
const mockGet = jest.fn()
const mockIncr = jest.fn()
const mockExpire = jest.fn()
const mockDel = jest.fn()
const mockAddPointsToLeaderboard = jest.fn()

jest.unstable_mockModule('../../models/Task.js', () => ({
  default: {
    findOne: mockTaskFindOne,
  },
}))

jest.unstable_mockModule('../../models/UserTaskProgress.js', () => ({
  default: {
    findOne: mockProgressFindOne,
    findOneAndUpdate: mockProgressFindOneAndUpdate,
  },
}))

jest.unstable_mockModule('../../services/redis.service.js', () => ({
  getRedisClient: mockGetRedisClient,
  get: mockGet,
  incr: mockIncr,
  expire: mockExpire,
  del: mockDel,
}))

jest.unstable_mockModule('../../services/leaderboard.service.js', () => ({
  addPointsToLeaderboard: mockAddPointsToLeaderboard,
}))

let submitFlagForUser

describe('flag.service unit', () => {
  beforeAll(async () => {
    ;({ submitFlagForUser } = await import('../../services/flag.service.js'))
  })

  beforeEach(() => {
    mockGetRedisClient.mockReturnValue(null)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('rejects when required fields are missing', async () => {
    await expect(
      submitFlagForUser({
        user: { _id: 'user-1' },
        taskId: '',
        flag: '',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'taskId and flag are required',
    })
  })

  it('marks a correct flag submission as completed and awards points', async () => {
    const submittedFlag = 'flag{correct-value}'
    const flagHash = crypto
      .createHash('sha256')
      .update(submittedFlag)
      .digest('hex')

    const selectTaskMock = jest.fn().mockResolvedValue({
      _id: 'task-1',
      type: 'flag',
      flagHash,
      points: 40,
    })

    mockTaskFindOne.mockReturnValue({
      select: selectTaskMock,
    })

    mockProgressFindOne.mockResolvedValue(null)
    mockProgressFindOneAndUpdate.mockResolvedValue({
      attempts: 1,
    })

    const result = await submitFlagForUser({
      user: { _id: 'user-1' },
      taskId: 'task-1',
      flag: submittedFlag,
    })

    expect(result).toMatchObject({
      message: 'Correct flag! 🎉',
      data: {
        taskId: 'task-1',
        attempts: 1,
        pointsEarned: 40,
      },
    })

    expect(mockAddPointsToLeaderboard).toHaveBeenCalledWith('user-1', 40)
    expect(mockDel).toHaveBeenCalledWith('flag:attempts:user-1:task-1')
  })

  it('rejects with incorrect flag and increments attempts', async () => {
    const expectedHash = crypto
      .createHash('sha256')
      .update('flag{expected}')
      .digest('hex')

    const selectTaskMock = jest.fn().mockResolvedValue({
      _id: 'task-2',
      type: 'flag',
      flagHash: expectedHash,
      points: 10,
    })

    mockTaskFindOne.mockReturnValue({
      select: selectTaskMock,
    })

    mockProgressFindOne.mockResolvedValue(null)

    await expect(
      submitFlagForUser({
        user: { _id: 'user-2' },
        taskId: 'task-2',
        flag: 'flag{wrong}',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Incorrect flag',
    })

    expect(mockIncr).not.toHaveBeenCalled()
    expect(mockExpire).not.toHaveBeenCalled()
    expect(mockAddPointsToLeaderboard).not.toHaveBeenCalled()
  })
})
