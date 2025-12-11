# tkmu
Helper kecil ala Spatie RBAC untuk Node/Next.js dengan API yang ringkas.

## Langkah ringkas guna
1) **Pasang pakej**
```sh
npm install dztech-tkmu
# atau
yarn add dztech-tkmu
```
2) **Sediakan data user** – `roles` dan/atau `permissions` dalam array.
3) **Panggil helper** di middleware, API route, atau komponen server.

## Contoh cepat
```ts
import { hasRole, hasAnyRole, can, hasAllPermissions } from "dztech-tkmu";

const user = {
  id: 123,
  roles: ["admin", "editor"],
  permissions: ["posts.create", "posts.publish"],
};

if (hasRole(user, "admin")) {
  console.log("Admin boleh masuk");
}

if (hasAnyRole(user, ["author", "editor"])) {
  console.log("Ada peranan sesuai");
}

if (can(user, "posts.create")) {
  console.log("Boleh buat post");
}

if (hasAllPermissions(user, ["posts.create", "posts.publish"])) {
  console.log("Lengkap izin untuk terbit");
}
```

## API
- `hasRole(user, role)` → `boolean`
- `hasAnyRole(user, roles[])` → `boolean`
- `can(user, permission)` → `boolean`
- `hasAllPermissions(user, permissions[])` → `boolean`

TypeScript disokong sepenuhnya (`UserLike`, `RoleName`, `PermissionName`).

## Nota
- Output tersedia untuk ESM (`dist/index.mjs`) dan CJS (`dist/index.cjs`).
- Sasaran runtime `es2020`; tiada kebergantungan runtime tambahan.

## Integrasi Prisma (auto setup)
1) Jalankan CLI untuk masukkan model Role/Permission/pivot jika belum ada:
```sh
npx tkmu-prisma --user-model=User
# fail disasar: prisma/schema.prisma
# CLI akan cuba tambah relation pada model user (UserRole[]) jika belum ada
# guna --force jika model User belum wujud tapi anda mahu tambah blok dahulu
```
2) Pastikan model Prisma anda ada relation `roles`/`permissions` dengan field `name` (atau namakan lain).
3) Ambil user dengan `include` relation tersebut.
4) Guna `fromPrismaUser` untuk jadikan `UserLike` yang boleh terus dipakai helper lain.

```ts
import { fromPrismaUser, hasRole, can } from "dztech-tkmu";
import { prisma } from "./prisma";

const dbUser = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    roles: true,          // [{ name: "admin" }]
    permissions: true,    // [{ name: "posts.create" }]
  },
});

const user = fromPrismaUser(dbUser); // auto extract name -> roles/permissions

if (hasRole(user, "admin") && can(user, "posts.create")) {
  // do something
}

// Jika nama field lain, berikan option
const userCustom = fromPrismaUser(dbUser, {
  roleNameKey: "roleName",
  permissionNameKey: "code",
});
```

// pehe dok? dok pehe ngop, makan trajang r demo. orang wak comey doh ni.. jet tekok kang.
