export async function seed(knex) {
  // Xóa trắng bảng khóa học cũ
await knex.raw('TRUNCATE TABLE courses RESTART IDENTITY CASCADE');
  
  // Chèn 3 khóa học mẫu
  await knex('courses').insert([
    {
      title: 'Kiến trúc Microservices',
      description: 'Học cách xây dựng hệ thống phân tán với Node.js, gRPC và Docker.',
      status: 'OPEN',
      enrolled_count: 0,
      capacity: 50
    },
    {
      title: 'GraphQL & Apollo Server',
      description: 'Xây dựng API Gateway với GraphQL.',
      status: 'OPEN',
      enrolled_count: 0,
      capacity: 40
    },
    {
      title: 'Cơ sở dữ liệu PostgreSQL',
      description: 'Quản trị cơ sở dữ liệu quan hệ.',
      status: 'OPEN',
      enrolled_count: 0,
      capacity: 60
    }
  ]);
};