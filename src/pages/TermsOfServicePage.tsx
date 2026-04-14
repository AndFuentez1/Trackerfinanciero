import { LegalDocumentShell } from '@/shared/components/LegalDocumentShell';

const LAST_UPDATED = '13 de abril de 2026';

export default function TermsOfServicePage() {
  return (
    <LegalDocumentShell title="Términos del servicio" lastUpdated={LAST_UPDATED}>
      <section className="space-y-3">
        <h2 id="aceptacion">1. Aceptación</h2>
        <p>
          Al crear una cuenta o utilizar TrackFinance (el Servicio), usted acepta estos Términos del servicio y nuestra Política
          de privacidad. Si no está de acuerdo, no utilice el Servicio.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="descripcion">2. Descripción del servicio</h2>
        <p>
          TrackFinance es una aplicación web de gestión financiera personal que permite registrar transacciones, presupuestos,
          métodos de pago y funciones relacionadas. El Servicio se ofrece tal cual y puede modificarse o interrumpirse con o sin
          previo aviso, salvo cuando la ley exija lo contrario.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="cuenta">3. Cuenta y elegibilidad</h2>
        <p>
          Debe proporcionar información veraz y mantener la confidencialidad de sus credenciales. Usted es responsable de toda
          actividad realizada con su cuenta. Notifíquenos de inmediato cualquier uso no autorizado.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="uso">4. Uso aceptable</h2>
        <p>No está permitido:</p>
        <ul>
          <li>Utilizar el Servicio de forma ilegal o para infringir derechos de terceros.</li>
          <li>Intentar acceder a sistemas, datos de otros usuarios o vulnerar la seguridad del Servicio.</li>
          <li>Realizar ingeniería inversa, scraping abusivo o sobrecarga de la infraestructura.</li>
          <li>Revender o sublicenciar el acceso al Servicio sin autorización escrita.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 id="datos">5. Datos y contenido del usuario</h2>
        <p>
          Usted conserva los derechos sobre los datos que introduce. Nos otorga una licencia limitada para alojar, procesar y
          mostrar esos datos con el fin de prestar el Servicio, de acuerdo con la Política de privacidad. Usted es responsable de
          la exactitud de la información financiera que registra.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="disponibilidad">6. Disponibilidad y cambios</h2>
        <p>
          No garantizamos disponibilidad ininterrumpida. Podemos actualizar funciones, corregir errores o suspender temporalmente
          el Servicio. Cuando sea razonable, comunicaremos cambios sustanciales por medios adecuados (por ejemplo, en la aplicación
          o por correo electrónico).
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="limitacion">7. Limitación de responsabilidad</h2>
        <p>
          En la medida permitida por la ley aplicable, TrackFinance y sus desarrolladores no serán responsables por daños
          indirectos, incidentales, especiales, consecuentes o lucro cesante derivados del uso o la imposibilidad de uso del
          Servicio. El Servicio no constituye asesoría financiera, fiscal ni legal; las decisiones que tome son bajo su propio
          criterio.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="ley">8. Ley aplicable y jurisdicción</h2>
        <p>
          Salvo que las normas imperativas de su país dispongan lo contrario, estas condiciones se interpretarán de acuerdo con las
          leyes aplicables según el domicilio del titular del Servicio y los tribunales competentes que correspondan. Los
          consumidores pueden conservar los derechos irrenunciables que les otorgue su legislación local.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="contacto">9. Contacto</h2>
        <p>
          Para consultas sobre estos términos, utilice los canales de contacto indicados en la aplicación o en el repositorio
          público del proyecto, según corresponda.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
