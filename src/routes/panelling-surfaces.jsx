import Page from '../pages/PannellingSurfaces'
import { pageMeta } from '../seo'

export const meta = () =>
  pageMeta({
    title: 'Panelling Surfaces | Toronto & GTA',
    description:
      'Wall and ceiling panelling solutions for every design aesthetic — V-groove, shiplap, beadboard, applied moulding, pre-finished, and acoustic panels. In stock for pickup or delivery across the GTA.',
    path: '/panelling-surfaces',
  })

export default function Route() {
  return <Page />
}
