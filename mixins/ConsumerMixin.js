import { Public } from 'plugins/holder/decorators'
import { registerVueHook, callAsyncHook } from 'plugins/holder/utils/hook'
import HolderBaseMixin from 'plugins/holder/mixins/HolderBaseMixin'
import { findHolderReg } from 'plugins/holder/utils/holder'
import { udpateMvms, cleanMvms } from 'plugins/holder/mvm'

registerVueHook('beforeConsume')

export const CONSUMER_TYPE = 'Consumer'

export default {
  extends: HolderBaseMixin,

  created() {
    this._holder.options[CONSUMER_TYPE] = { cbCreated, cbExisted }
    this.$publish('$consume')
  },

  beforeDestroy() {
    cleanMvms(this, CONSUMER_TYPE)
  },

  methods: {
    $consume (products, eventArgs) {
      this._products = products
      this._eventArgs = eventArgs
      this.$log('consume', () => `consume(${eventArgs ? JSON.stringify(eventArgs) : ''})`)
      callAsyncHook(this, 'beforeConsume', products, eventArgs)
      this.$nextTick(() => {
        udpateMvms(this, CONSUMER_TYPE)
      })
    }
  }
}

function cbCreated (vm, mvmReg) {
  callConsumeFunc(vm, mvmReg)
}

function cbExisted (vm, mvmReg) {
  if (isValidToConsume(vm, mvmReg)) {
    callConsumeFunc(vm, mvmReg)
  }
}

function isValidToConsume (vm, mvmReg) {
  if (vm.$options.linkProducerConsumer) {
    const eventArgs = vm._eventArgs
    mvmReg.producers = mvmReg.producers || []
    return !eventArgs.checkSrcProducers
      || mvmReg.producers.some(producerName => {
        const producerReg = findHolderReg(vm, producerName)
        return producerReg && eventArgs.producerIds.includes(producerReg.id)
      })
  } else {
    return true
  }
}

function callConsumeFunc (vm, mvmReg) {
  if (mvmReg.cleanFunc) {
    vm.$log('clean', `Call cleanFunc before consume on '${mvmReg.id}'`)
    mvmReg.cleanFunc.call(vm)
  }
  return mvmReg.consumeFunc.call(vm, vm._products, mvmReg.uid)
}