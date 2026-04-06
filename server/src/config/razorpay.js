import Razorpay from 'razorpay'
import config from './index.js'
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('razorpay')

if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    log.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set. Payment features will be disabled.')
}

const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
})

export default razorpay
