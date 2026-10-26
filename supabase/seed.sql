-- ==============================================================================
-- FY IT Task Manager - Initial Academic Seed Data
-- ==============================================================================

-- 1. Insert Core FY B.Sc. IT Subjects
INSERT INTO public.subjects (id, name, subject_code, description, teacher_name, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'C Programming', 'IT101', 'Imperative Programming with C language, pointers, and memory management', 'Prof. Sharma', true),
    ('a0000000-0000-0000-0000-000000000002', 'Database Management Systems', 'IT102', 'Relational database design, SQL querying, normalization and transactions', 'Dr. Mehta', true),
    ('a0000000-0000-0000-0000-000000000003', 'Data Structures', 'IT103', 'Linear and non-linear data structures, searching, and sorting algorithms', 'Prof. Kulkarni', true),
    ('a0000000-0000-0000-0000-000000000004', 'Discrete Mathematics', 'MAT104', 'Set theory, propositional logic, matrices, and recurrence relations', 'Dr. Roy', true),
    ('a0000000-0000-0000-0000-000000000005', 'Technical Communication Skills', 'ENG105', 'Business correspondence, report writing, presentation and documentation skills', 'Prof. Fernandes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Topics for Each Subject
-- C Programming Topics
INSERT INTO public.topics (subject_id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Introduction to C & Setup', 'C compilers, tokens, keywords, and basic structure of a C program'),
    ('a0000000-0000-0000-0000-000000000001', 'Variables, Constants & Data Types', 'Primitive types, format specifiers, typecasting, and scope'),
    ('a0000000-0000-0000-0000-000000000001', 'Operators & Expressions', 'Arithmetic, relational, logical, bitwise, and ternary operators'),
    ('a0000000-0000-0000-0000-000000000001', 'Conditional Statements', 'if, if-else, nested if-else, and switch-case syntax'),
    ('a0000000-0000-0000-0000-000000000001', 'Loops & Iterations', 'while, do-while, and for loops with break and continue statements'),
    ('a0000000-0000-0000-0000-000000000001', 'Arrays & Strings', '1D and 2D arrays, string manipulation functions'),
    ('a0000000-0000-0000-0000-000000000001', 'Functions & Recursion', 'Pass by value vs pass by reference, function signatures, recursive calls'),
    ('a0000000-0000-0000-0000-000000000001', 'Pointers & Dynamic Memory', 'Pointer arithmetic, malloc(), calloc(), free(), and realloc()');

-- Database Management Systems Topics
INSERT INTO public.topics (subject_id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000002', 'Introduction to DBMS & File Systems', 'Database architecture, data independence, 3-tier schema'),
    ('a0000000-0000-0000-0000-000000000002', 'ER Model & ER Diagrams', 'Entities, attributes, relationships, cardinality, and ER to table mapping'),
    ('a0000000-0000-0000-0000-000000000002', 'Relational Model & Algebra', 'Tuple relational calculus, keys (PK, FK, candidate, super key)'),
    ('a0000000-0000-0000-0000-000000000002', 'SQL Queries (DDL, DML, DQL)', 'CREATE, ALTER, INSERT, UPDATE, DELETE, SELECT, JOINs, and subqueries'),
    ('a0000000-0000-0000-0000-000000000002', 'Normalization (1NF, 2NF, 3NF, BCNF)', 'Functional dependencies, anomalies, lossless decomposition');

-- Data Structures Topics
INSERT INTO public.topics (subject_id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000003', 'Introduction to Data Structures & Time Complexity', 'Asymptotic notations Big-O, Omega, Theta, and space complexity'),
    ('a0000000-0000-0000-0000-000000000003', 'Arrays & Matrices', 'Row-major and column-major order, sparse matrix representation'),
    ('a0000000-0000-0000-0000-000000000003', 'Linked Lists', 'Singly, doubly, and circular linked lists with insertion and deletion'),
    ('a0000000-0000-0000-0000-000000000003', 'Stacks & Infix/Postfix Applications', 'LIFO operations, push, pop, stack evaluation of expressions'),
    ('a0000000-0000-0000-0000-000000000003', 'Queues & Circular Queues', 'FIFO operations, circular queue array implementation');

-- Discrete Mathematics Topics
INSERT INTO public.topics (subject_id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000004', 'Set Theory & Venn Diagrams', 'Operations on sets, power sets, Cartesian product'),
    ('a0000000-0000-0000-0000-000000000004', 'Propositional Logic & Truth Tables', 'Tautologies, contradictions, logical equivalences, and quantifiers'),
    ('a0000000-0000-0000-0000-000000000004', 'Relations & Equivalence Relations', 'Reflexive, symmetric, transitive relations, partial ordering'),
    ('a0000000-0000-0000-0000-000000000004', 'Graph Theory Basics', 'Vertices, edges, trees, Eulerian and Hamiltonian paths');

-- 3. Initial Sample Announcement
INSERT INTO public.announcements (title, message, published_at)
VALUES (
    'Welcome to FY B.Sc. IT Academic Session!',
    'All First Year B.Sc. IT students must submit their daily handwritten lab practicals and assignments through this portal. Ensure your roll number and division are accurate in your profile.',
    NOW()
);
