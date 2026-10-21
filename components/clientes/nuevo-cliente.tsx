import { UserPlus } from 'lucide-react'
import { crearCliente } from '@/actions/clientes'
import { FormDialogo } from '@/components/form-dialogo'
import { CamposCliente } from '@/components/campos'

/** Alta manual. Lo normal es que el cliente nazca desde el Pipeline ("Convertir en cliente"). */
export function NuevoCliente({ variante = 'primary' }: { variante?: 'primary' | 'secondary' }) {
  return (
    <FormDialogo
      titulo="Nuevo cliente"
      trigger={
        <>
          <UserPlus size={16} />
          Nuevo cliente
        </>
      }
      triggerVariant={variante}
      action={crearCliente}
      submitLabel="Crear cliente"
    >
      <CamposCliente />
    </FormDialogo>
  )
}
