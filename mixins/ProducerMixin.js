import { registerVueHook, callAsyncHook } from 'plugins/holder/utils/hook'
import HolderBaseMixin, { callMvmsUpdatedHook } from 'plugins/holder/mixins/HolderBaseMixin'
import { findHolderReg } from 'plugins/holder/utils/holder'
import { registerMvm, createMvm, cleanMvm, cleanMvms } from 'plugins/holder/mvm'

registerVueHook('produced')

export const PRODUCER_TYPE = 'Producer'

export default {
  extends: HolderBaseMixin,

  beforeCreate() {
    this._products = {}
  },

  created() {
    this._holder.options[PRODUCER_TYPE] = {
      templateAdds: `@produce="_callHoldersUpdatedHook({ producerIds: [arguments[0]] })"`
    }
  },

  mounted() {
    doubleLinkProceduers(this)
  },

  async initMvms() {
    await makeProducers(this, { initializing: true })
  },

  beforeDestroy() {
    cleanMvms(this, PRODUCER_TYPE)
  },

  methods: {
    async _produce (eventArgs) {
      this.$log('produce', () => `produce(${JSON.stringify(eventArgs)})`)
      let mvmRegs = filterProducerRegs(this, eventArgs)
      mvmRegs = getPrimaryRegs(mvmRegs)

      const productParts = await Promise.all(
        mvmRegs.map(mvmReg => {
          if (mvmReg.produceFunc) {
            return mvmReg.produceFunc.call(this, mvmReg.uid)
          }
        })
      )
      productParts.forEach(part => Object.assign(this._products, part))

      await callAsyncHook(this, 'produced', this._products, eventArgs)
      return mvmRegs.map(r => r.id)
    },

    _callHoldersUpdatedHook (eventArgs) {
      callMvmsUpdatedHook(this, eventArgs);
    },

    async $resetProducers (producerIds) {
      this.$log('produce', () => `Reset producers: ${JSON.stringify(producerIds)}`)
      await makeProducers(this, { producerIds })
      callMvmsUpdatedHook(this, { initializing: true })
    }
  }
}

export async function propagatingProduce (vm, producerIds) {
  if (producerIds && producerIds.length) {
    const successorIds = getSuccessorIds(vm, producerIds)
    if (successorIds.length) {
      vm.$log('produce', () => `Propagating Produce: ${JSON.stringify(successorIds)}`)
      await vm._produce({ producerIds: successorIds })
      callMvmsUpdatedHook(vm, { producerIds: successorIds })
    }
  }
}

async function makeProducers (vm, args) {
  if (!args.initializing) {
    filterProducerRegs(vm, args).forEach(mvmReg => {
      cleanMvm(vm, mvmReg)
      registerMvm(vm, mvmReg, mvmReg.id, mvmReg.uid)
    })
  }

  await Promise.all(
    filterProducerRegs(vm, args).map(mvmReg => createMvm(vm, mvmReg))
  )
}

function filterProducerRegs (vm, args) {
  const producerIds = !args.initializing && (args.producerIds || [])
  const mvmRegs = Object.values(vm._holder.mvmRegs[PRODUCER_TYPE] || {})
  return producerIds
    ? mvmRegs.filter(r => producerIds.includes(r.id))
    : mvmRegs
}

function doubleLinkProceduers (vm) {
  Object.values(vm._holder.regs)
    .filter(reg => reg.type == PRODUCER_TYPE)
    .forEach(({ name, predecessors, successors }) => {
      if (Array.isArray(predecessors)) {
        predecessors.forEach(predName => {
          const pred = findHolderReg(vm, predName)
          if (pred) {
            pred.successors = pred.successors || []
            if (!pred.successors.includes(name)) {
              pred.successors.push(name)
            }
          }
        })
      }

      if (Array.isArray(successors)) {
        successors.forEach(succName => {
          const succ = findHolderReg(vm, succName)
          if (succ) {
            succ.predecessors = succ.predecessors || []
            if (!succ.predecessors.includes(name)) {
              succ.predecessors.push(name)
            }
          }
        })
      }
    })
}

function getSuccessorIds (vm, producerIds) {
  const mvmRegs = filterProducerRegs(vm, { producerIds })
  const results = mvmRegs.reduce((result, mvmReg) => {
    const successors = mvmReg.successors || []
    return result.concat(
      successors.map(successor => successor.id)
    )
  }, [])
  return [...new Set(results)]
}

function getPrimaryRegs (mvmRegs) {
  const map = new Map()
  mvmRegs.forEach(r => map.set(r.id, r))

  const removeSuccessors = mvmReg => {
    if (mvmReg.successors) {
      mvmReg.successors.forEach(successor => {
        map.delete(successor.id)
        removeSuccessors(successor)
      })
    }
  }

  mvmRegs.forEach(removeSuccessors)

  return [ ...map.values() ]
}