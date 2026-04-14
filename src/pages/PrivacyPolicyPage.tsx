import { LegalDocumentShell } from '@/shared/components/LegalDocumentShell';

const LAST_UPDATED = '13 de abril de 2026';

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentShell title="Política de privacidad" lastUpdated={LAST_UPDATED}>
      <section className="space-y-3">
        <h2 id="responsable">1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de los datos personales en relación con TrackFinance es el titular del proyecto /
          desarrollador que opera la instancia del Servicio que usted utiliza (en adelante, el &quot;Responsable&quot;). Los datos
          técnicos de alojamiento y autenticación pueden tratarse en nombre del Responsable por proveedores de infraestructura en
          Estados Unidos u otras regiones, según se describe a continuación.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="datos">2. Categorías de datos</h2>
        <p>Podemos tratar, entre otros:</p>
        <ul>
          <li>
            <strong className="text-foreground">Identificación y cuenta:</strong> correo electrónico, identificador de usuario,
            nombre para mostrar y datos de sesión.
          </li>
          <li>
            <strong className="text-foreground">Datos financieros que usted introduce:</strong> transacciones, presupuestos,
            métodos de pago, metas y configuraciones relacionadas.
          </li>
          <li>
            <strong className="text-foreground">Datos técnicos:</strong> dirección IP, tipo de navegador, registros básicos de
            errores y métricas de uso necesarias para operar y mejorar el Servicio.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 id="finalidades">3. Finalidades y bases legales</h2>
        <p>Tratamos datos personales para:</p>
        <ul>
          <li>
            <strong className="text-foreground">Prestar el Servicio</strong> (ejecución del contrato / medidas precontractuales).
          </li>
          <li>
            <strong className="text-foreground">Seguridad y prevención de abuso</strong> (interés legítimo o obligación legal,
            según el caso).
          </li>
          <li>
            <strong className="text-foreground">Cumplimiento normativo</strong> cuando resulte aplicable (p. ej. obligaciones
            fiscales o requerimientos válidos de autoridad).
          </li>
          <li>
            <strong className="text-foreground">Mejora del producto</strong> de forma agregada o anonimizada cuando sea posible
            (interés legítimo).
          </li>
        </ul>
        <p>
          El consentimiento explícito se utiliza cuando la ley lo exija (por ejemplo, ciertas comunicaciones opcionales o cookies
          no esenciales, si se implementan).
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="transferencias">4. Transferencias internacionales</h2>
        <p>
          El Servicio puede alojarse o utilizar subencargados (por ejemplo, proveedor de base de datos y autenticación en la nube)
          ubicados en <strong className="text-foreground">Estados Unidos</strong> u otros países. En esos casos aplicamos
          salvaguardas apropiadas conforme al RGPD y normativa comparable (cláusulas contractuales tipo, evaluaciones de impacto
          cuando proceda y minimización de datos).
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="plazos">5. Conservación</h2>
        <p>
          Conservamos los datos el tiempo necesario para cumplir las finalidades descritas y las obligaciones legales. Puede
          solicitar la eliminación de su cuenta; algunos datos podrán conservarse anonimizados o durante los plazos legales de
          retención.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="derechos">6. Sus derechos</h2>
        <p>
          Según su jurisdicción, puede tener derecho a acceder, rectificar, suprimir, limitar el tratamiento, oponerse, retirar el
          consentimiento y solicitar la portabilidad de sus datos. Para ejercerlos, contacte al Responsable a través de los canales
          indicados en la aplicación. También puede presentar reclamación ante la autoridad de protección de datos de su país.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="seguridad">7. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas y organizativas razonables (incluido control de acceso, cifrado en tránsito cuando el
          proveedor lo admite y políticas de contraseñas seguras). Ningún sistema es 100% seguro; le recomendamos proteger su
          cuenta y dispositivo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="menores">8. Menores</h2>
        <p>
          El Servicio no está dirigido a menores de 16 años (o la edad mínima aplicable en su país). No recopilamos datos de
          menores de forma intencionada.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="cambios">9. Cambios de esta política</h2>
        <p>
          Podemos actualizar esta política. La fecha de &quot;Última actualización&quot; reflejará la versión vigente. El uso
          continuado del Servicio tras cambios relevantes implica la aceptación de la nueva política, salvo que la ley exija un
          consentimiento adicional.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="contacto">10. Contacto</h2>
        <p>
          Para ejercer derechos o consultas sobre privacidad, utilice los canales publicados en la aplicación o en la documentación
          del proyecto.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
