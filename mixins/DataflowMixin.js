import { registerVueHooks, callAsyncHook } from 'plugins/holder/utils/hook'
import ProducerMixin, { propagatingProduce } from './ProducerMixin'
import ConsumerMixin from './ConsumerMixin'

registerVueHooks([ 'beforeDataRender', 'dataRendered' ])

export default {
  mixins: [ProducerMixin, ConsumerMixin],

  mvmsUpdated(eventArgs) {
    dataRender(this, eventArgs)
  },

  methods: {
    $dataRenderFailed (error) {
      console.error(error)
      alert(error)
    }
  }
}

function dataRender (vm, eventArgs) {
  callAsyncHook(vm, 'beforeDataRender');
  doDataRender(vm, eventArgs)
    .catch((error) => {
      vm.$dataRenderFailed(error)
    })
    .finally(() => {
      callAsyncHook(vm, 'dataRendered');
    })
}

async function doDataRender (vm, eventArgs) {
  vm.$log('render', () => `render(${JSON.stringify(eventArgs)})`)

  eventArgs.producerIds = await vm._produce(eventArgs)
  vm.$consume(vm._products, { ...eventArgs, checkSrcProducers: true })
  await propagatingProduce(vm, eventArgs.producerIds)

  vm.$log('render', 'render finished')
}