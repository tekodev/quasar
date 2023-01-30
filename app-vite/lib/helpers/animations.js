import { getPackage } from './get-package.js'

const {
  generalAnimations,
  inAnimations,
  outAnimations
} = await getPackage('@quasar/extras/animate/animate-list.common')

export const animations = generalAnimations.concat(inAnimations).concat(outAnimations)
