-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 28-12-2022 a las 15:32:43
-- Versión del servidor: 10.4.24-MariaDB
-- Versión de PHP: 8.1.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `discordbot`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `guilds`
--

CREATE TABLE `guilds` (
  `id` varchar(255) NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  `setup` tinyint(1) NOT NULL DEFAULT 0,
  `name` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `type` varchar(32) DEFAULT NULL,
  `hash` varchar(255) DEFAULT NULL
) ;

--
-- Volcado de datos para la tabla `guilds`
--

INSERT INTO `guilds` (`id`, `joined_at`, `setup`, `name`, `token`, `type`, `hash`) VALUES
('833078161112825916', '2022-12-24 10:22:36', 1, 'HydraBot', 'bce6913424f02cf3c29f1e1078298bc77512c0b970a8dde31b1a1c46cd499f6116529fb0780c520ee36c3f74e52d5beb5d70', 'craftingstore', '4959e566a4f630ab');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permissions`
--

CREATE TABLE `permissions` (
  `guildId` varchar(255) NOT NULL,
  `id` varchar(255) NOT NULL,
  `permission_node` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `permissions`
--

INSERT INTO `permissions` (`guildId`, `id`, `permission_node`) VALUES
('833078161112825916', '515280377808683009', 1),
('833078161112825916', '515280377808683009', 2),
('833078161112825916', '838388122072645663', 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permissions_name`
--

CREATE TABLE `permissions_name` (
  `value` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `command` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Volcado de datos para la tabla `permissions_name`
--

INSERT INTO `permissions_name` (`value`, `name`, `command`) VALUES
(1, 'Search Transactions', 'search'),
(2, 'Manage Permissions', 'perm'),
(3, 'Create GiftCards', 'giftcard'),
(4, 'User Payments', 'payments'),
(5, 'Delete Giftcards', 'giftcard');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `guilds`
--
ALTER TABLE `guilds`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`guildId`,`id`,`permission_node`),
  ADD KEY `fk_permission_name` (`permission_node`);

--
-- Indices de la tabla `permissions_name`
--
ALTER TABLE `permissions_name`
  ADD PRIMARY KEY (`value`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `permissions_name`
--
ALTER TABLE `permissions_name`
  MODIFY `value` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `permissions`
--
ALTER TABLE `permissions`
  ADD CONSTRAINT `fk_guildId` FOREIGN KEY (`guildId`) REFERENCES `guilds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_permission_name` FOREIGN KEY (`permission_node`) REFERENCES `permissions_name` (`value`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
