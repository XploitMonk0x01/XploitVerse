import { asyncHandler } from '../middleware/error.middleware.js'
import flagService from '../services/flag.service.js'

export const submitFlag = asyncHandler(async (req, res) => {
  const result = await flagService.submitFlagForUser({
    user: req.user,
    taskId: req.body.taskId,
    flag: req.body.flag,
  })

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.data,
  })
})

export default { submitFlag }
