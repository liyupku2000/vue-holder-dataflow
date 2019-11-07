import ConsumerMixin, { CONSUMER_TYPE } from './mixins/ConsumerMixin'
import ProducerMixin, { PRODUCER_TYPE } from './mixins/ProducerMixin'
import registerVueHolderExtension from 'plugins/holder/extend'

const installOptions = {}

function normalizeOptions (options) {
  options.globalProducerMixin = options.globalProducerMixin == true
  options.globalConsumerMixin = options.globalConsumerMixin == true
  return options
}

export default function installVueDataflow (options = {}) {
  Object.assign(installOptions, normalizeOptions(options))

  registerVueHolderExtension(PRODUCER_TYPE, { produceFunc: Function })
  if (installOptions.globalProducerMixin) {
    Vue.mixin(ProducerMixin)
  }

  registerVueHolderExtension(CONSUMER_TYPE, { consumeFunc: Function })
  if (installOptions.globalConsumerMixin) {
    Vue.mixin(ConsumerMixin)
  }
}

export { installOptions }