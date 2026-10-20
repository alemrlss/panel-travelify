-- Alta del único usuario del panel. Ejecutar DESPUÉS de migrations/0001_init.sql.
-- El usuario de Auth ya existe (creado vía Auth Admin API el 2026-10-20).
insert into public.team_members (id, email, full_name)
values ('51e433cc-262f-40c7-9911-145e47644e8c', 'alejandroaml0528@gmail.com', 'Alejandro Morales')
on conflict (id) do nothing;
