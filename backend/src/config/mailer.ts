import nodemailer from 'nodemailer';

const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const ROLE_LABEL: Record<string, string> = {
  pedagogico: 'Coordenador(a) Pedagógico(a)',
  professor: 'Professor(a)',
  aluno: 'Aluno(a)',
};

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  profileCode: string;
  password: string;
  role: string;
}) {
  const { to, name, profileCode, password, role } = params;
  const roleLabel = ROLE_LABEL[role] ?? role;

  if (!SMTP_CONFIGURED || !transporter) {
    console.log(
      `[EMAIL — SMTP não configurado] Para: ${to} | Perfil: ${profileCode} | Senha: ${password}`
    );
    return;
  }

  const from = process.env.SMTP_FROM || 'noreply@colegiocristao.edu.br';

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#0a1628;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:32px 16px;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#0d1a3a;border-radius:20px;overflow:hidden;border:1px solid rgba(240,192,64,0.2);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#1a2d5a,#0d1a3a);padding:32px 32px 24px;text-align:center;">
                <div style="font-size:40px;margin-bottom:8px;">🚀</div>
                <h1 style="color:#f0c040;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Colégio Cristão</h1>
                <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:13px;">Plataforma Espacial de Aprendizagem</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:28px 32px;">
                <p style="color:rgba(255,255,255,0.9);font-size:16px;margin:0 0 6px;">Olá, <strong>${name}</strong>!</p>
                <p style="color:rgba(255,255,255,0.55);font-size:14px;margin:0 0 24px;line-height:1.5;">
                  Sua conta de <strong style="color:#f0c040;">${roleLabel}</strong> foi criada com sucesso.
                  Abaixo estão seus dados de acesso à plataforma:
                </p>

                <!-- Credential box -->
                <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(240,192,64,0.2);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;">
                        <span style="color:rgba(255,255,255,0.4);font-size:12px;display:block;margin-bottom:2px;">Código de Perfil</span>
                        <span style="color:#f0c040;font-size:20px;font-weight:700;letter-spacing:2px;">${profileCode}</span>
                      </td>
                    </tr>
                    <tr><td style="height:12px;"></td></tr>
                    <tr>
                      <td style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.07);">
                        <span style="color:rgba(255,255,255,0.4);font-size:12px;display:block;margin-bottom:2px;">E-mail de acesso</span>
                        <span style="color:#fff;font-size:14px;">${to}</span>
                      </td>
                    </tr>
                    <tr><td style="height:12px;"></td></tr>
                    <tr>
                      <td style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.07);">
                        <span style="color:rgba(255,255,255,0.4);font-size:12px;display:block;margin-bottom:2px;">Senha</span>
                        <span style="color:#fff;font-size:18px;font-weight:600;letter-spacing:1px;font-family:monospace;">${password}</span>
                      </td>
                    </tr>
                  </table>
                </div>

                <p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;margin:0 0 20px;">
                  🔒 Por segurança, recomendamos alterar sua senha após o primeiro acesso.<br>
                  Guarde suas credenciais em local seguro.
                </p>

                <div style="text-align:center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}"
                     style="display:inline-block;background:linear-gradient(135deg,#f0c040,#eab308);color:#0a1628;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
                    Acessar Plataforma →
                  </a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 32px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.07);">
                <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">
                  Este e-mail foi gerado automaticamente pelo sistema do Colégio Cristão.<br>
                  Em caso de dúvidas, entre em contato com a administração.
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Colégio Cristão" <${from}>`,
      to,
      subject: `Bem-vindo(a) ao Colégio Cristão — Seus dados de acesso`,
      html,
    });
    console.log(`[EMAIL] Enviado para ${to}`);
  } catch (err) {
    console.error(`[EMAIL] Falha ao enviar para ${to}:`, err);
    // Não lança erro — criação do usuário não deve falhar por causa do e-mail
  }
}
