export const AddressLink = ({
  address,
  truncate,
}: {
  address: string;
  truncate?: boolean;
}) => {
  // Simple check: EVM addresses start with 0x and are 42 chars long
  const isEvm = address.startsWith("0x") && address.length === 42;
  const href = isEvm
    ? `https://evm.flowscan.io/address/${address}`
    : `https://flowsca.io/account/${address}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-neutral-100 font-mono text-xs hover:text-blue-400 transition-colors"
    >
      {isEvm && truncate
        ? `${address.slice(0, 8)}...${address.slice(-8)}`
        : address}
    </a>
  );
};
